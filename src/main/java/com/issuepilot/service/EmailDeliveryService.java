package com.issuepilot.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Transactional email delivery service for OTP verification and password resets.
 *
 * Delivery hierarchy:
 * 1. Primary: Resend HTTP API (HTTPS 443, reliable on Render/cloud PaaS).
 * 2. Fallback: Standard SMTP (Gmail App Password or custom SMTP host).
 *
 * Fails closed with 503 Service Unavailable if no delivery provider is configured.
 */
@Service
public class EmailDeliveryService {

    private static final Logger logger = LoggerFactory.getLogger(EmailDeliveryService.class);

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final JavaMailSender injectedMailSender;
    private final HttpClient httpClient;

    @Autowired
    public EmailDeliveryService(
            AppProperties properties,
            ObjectMapper objectMapper,
            @Autowired(required = false) JavaMailSender injectedMailSender
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.injectedMailSender = injectedMailSender;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isResendConfigured() {
        return properties.getResendApiKey() != null && !properties.getResendApiKey().isBlank();
    }

    public boolean isSmtpConfigured() {
        if (injectedMailSender != null && hasText(properties.getSmtpHost())) {
            return true;
        }
        return hasText(properties.getSmtpHost())
                && (!properties.isSmtpAuth() || (hasText(properties.getSmtpUsername()) && hasText(properties.getSmtpPassword())));
    }

    public boolean isConfigured() {
        return isResendConfigured() || isSmtpConfigured() || injectedMailSender != null;
    }

    public void sendOtpEmail(String recipientEmail, String otpCode, String purpose, int expiryMinutes) {
        String safeRecipient = recipientEmail == null ? "" : recipientEmail.trim();
        if (safeRecipient.isBlank()) {
            throw new IllegalArgumentException("Recipient email is required.");
        }

        boolean isPasswordReset = "PASSWORD_RESET".equalsIgnoreCase(purpose);
        String subject = isPasswordReset
                ? "Issue Pilot — Password Reset Verification Code"
                : "Issue Pilot — Verify Your Email Address";

        String heading = isPasswordReset
                ? "Reset your Issue Pilot password"
                : "Confirm your Issue Pilot email address";

        String intro = isPasswordReset
                ? "Use the 6-digit verification code below to reset your password."
                : "Use the 6-digit verification code below to activate your Issue Pilot account.";

        String html = buildOtpHtml(heading, intro, otpCode, expiryMinutes);
        String text = heading + "\n\n" + intro + "\n\nYour code: " + otpCode
                + "\nThis code expires in " + expiryMinutes + " minutes.\n\nIf you did not request this, you can safely ignore this email.";

        boolean resendReady = isResendConfigured();
        boolean smtpReady = isSmtpConfigured() || injectedMailSender != null;

        if (!resendReady && !smtpReady) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured on this server. Set RESEND_API_KEY or SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD."
            );
        }

        Exception lastError = null;

        if (resendReady) {
            try {
                sendViaResend(safeRecipient, subject, html, text);
                logger.info("Verification email dispatched via Resend API to {}", maskEmail(safeRecipient));
                return;
            } catch (Exception e) {
                lastError = e;
                logger.warn("Resend email delivery failed for {}: {}", maskEmail(safeRecipient), e.getMessage());
            }
        }

        if (smtpReady) {
            try {
                sendViaSmtp(safeRecipient, subject, html, text);
                logger.info("Verification email dispatched via SMTP to {}", maskEmail(safeRecipient));
                return;
            } catch (Exception e) {
                lastError = e;
                logger.error("SMTP email delivery failed for {}: {}", maskEmail(safeRecipient), e.getMessage());
            }
        }

        String detail = lastError != null ? lastError.getMessage() : "Unknown mail transport error";
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to deliver verification email (" + detail + "). Check mail provider credentials."
        );
    }

    protected void sendViaResend(String to, String subject, String html, String text) throws Exception {
        String fromAddress = resolveFromAddress("Issue Pilot <onboarding@resend.dev>");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", fromAddress);
        payload.put("to", List.of(to));
        payload.put("subject", subject);
        payload.put("html", html);
        payload.put("text", text);

        String json = objectMapper.writeValueAsString(payload);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(properties.getResendApiUrl()))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + properties.getResendApiKey().trim())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Resend API returned HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    protected void sendViaSmtp(String to, String subject, String html, String text) throws Exception {
        JavaMailSender sender = resolveMailSender();
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        String defaultFrom = hasText(properties.getSmtpUsername()) ? properties.getSmtpUsername().trim() : "noreply@issuepilot.dev";
        helper.setFrom(resolveFromAddress(defaultFrom));
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(text, html);
        sender.send(message);
    }

    private JavaMailSender resolveMailSender() {
        if (hasText(properties.getSmtpHost())) {
            JavaMailSenderImpl impl = new JavaMailSenderImpl();
            impl.setHost(properties.getSmtpHost().trim());
            impl.setPort(properties.getSmtpPort());
            impl.setDefaultEncoding(StandardCharsets.UTF_8.name());
            if (hasText(properties.getSmtpUsername())) {
                impl.setUsername(properties.getSmtpUsername().trim());
            }
            if (hasText(properties.getSmtpPassword())) {
                impl.setPassword(properties.getSmtpPassword());
            }

            Properties mailProps = impl.getJavaMailProperties();
            mailProps.put("mail.transport.protocol", "smtp");
            mailProps.put("mail.smtp.auth", String.valueOf(properties.isSmtpAuth()));
            mailProps.put("mail.smtp.starttls.enable", String.valueOf(properties.isSmtpStarttls()));
            mailProps.put("mail.smtp.connectiontimeout", "10000");
            mailProps.put("mail.smtp.timeout", "10000");
            mailProps.put("mail.smtp.writetimeout", "10000");
            return impl;
        }
        if (injectedMailSender != null) {
            return injectedMailSender;
        }
        throw new IllegalStateException("SMTP host is not configured.");
    }

    private String resolveFromAddress(String fallback) {
        return hasText(properties.getMailFrom()) ? properties.getMailFrom().trim() : fallback;
    }

    private String buildOtpHtml(String heading, String intro, String otpCode, int expiryMinutes) {
        return """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; color: #0f172a;">
                  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
                    <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: #2563eb; text-transform: uppercase; margin-bottom: 12px;">Issue Pilot</div>
                    <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0; color: #0f172a;">%s</h1>
                    <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">%s</p>
                    <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                      <span style="font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #0f172a;">%s</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">This verification code expires in <strong>%d minutes</strong>. If you did not request this email, you can safely ignore it.</p>
                  </div>
                </div>
                """.formatted(heading, intro, otpCode, expiryMinutes);
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}

