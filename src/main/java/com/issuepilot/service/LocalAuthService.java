package com.issuepilot.service;

import com.issuepilot.config.AppProperties;
import com.issuepilot.repository.EmailOtpRepository;
import com.issuepilot.repository.LocalCredentialRepository;
import com.issuepilot.repository.UserRepository;
import com.issuepilot.security.TokenService;
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Service implementing local email/password authentication with BCrypt hashing,
 * 6-digit email OTP verification, and OTP-backed password resets.
 */
@Service
public class LocalAuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    private record FailedLoginWindow(int count, Instant windowStart) {}
    private final Map<String, FailedLoginWindow> failedLogins = new java.util.concurrent.ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final LocalCredentialRepository credentialRepository;
    private final EmailOtpRepository otpRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final AppProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public static class EmailNotVerifiedException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private final String email;

        public EmailNotVerifiedException(String email, String message) {
            super(message);
            this.email = email;
        }

        public String getEmail() {
            return email;
        }
    }

    public LocalAuthService(
            UserRepository userRepository,
            LocalCredentialRepository credentialRepository,
            EmailOtpRepository otpRepository,
            EmailDeliveryService emailDeliveryService,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            AppProperties properties
    ) {
        this.userRepository = userRepository;
        this.credentialRepository = credentialRepository;
        this.otpRepository = otpRepository;
        this.emailDeliveryService = emailDeliveryService;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.properties = properties;
    }

    public Map<String, Object> register(String firstName, String lastName, String rawEmail, String rawPassword) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);
        validatePasswordStrength(rawPassword);

        Document existingCred = credentialRepository.findByEmail(cleanEmail);
        boolean isBrandNewCredential = (existingCred == null);
        if (existingCred != null && Boolean.TRUE.equals(existingCred.getBoolean("email_verified"))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists. Please sign in or reset your password."
            );
        }

        enforceResendCooldown(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);

        String displayName = buildDisplayName(firstName, lastName, cleanEmail);
        String username = buildUsername(cleanEmail);
        String canonicalUserId = "local:" + cleanEmail;
        String passwordHash = passwordEncoder.encode(rawPassword);

        // Provision profile in 'users' and isolated password hash in 'local_credentials'
        userRepository.provisionOrUpdateOAuthUser(
                "local",
                cleanEmail,
                username,
                displayName,
                "https://api.dicebear.com/7.x/identicon/svg?seed="
                        + URLEncoder.encode(cleanEmail, StandardCharsets.UTF_8),
                "",
                cleanEmail
        );
        credentialRepository.upsertCredential(canonicalUserId, cleanEmail, passwordHash, false);

        try {
            issueAndSendOtp(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);
        } catch (RuntimeException ex) {
            otpRepository.deleteOtp(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);
            if (isBrandNewCredential) {
                credentialRepository.deleteByEmail(cleanEmail);
            }
            throw ex;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "verification_required");
        response.put("requires_verification", true);
        response.put("email", cleanEmail);
        response.put("expires_in_seconds", properties.getOtpExpiryMinutes() * 60);
        response.put("resend_cooldown_seconds", properties.getOtpResendCooldownSeconds());
        response.put("message", "Verification code sent to " + cleanEmail + ".");
        return response;
    }

    public Map<String, Object> verifyEmailOtp(String rawEmail, String rawOtp) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);
        String cleanOtp = normalizeOtp(rawOtp);

        Document cred = credentialRepository.findByEmail(cleanEmail);
        if (cred == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No registration found for this email.");
        }

        verifyOtpCode(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION, cleanOtp);

        credentialRepository.markEmailVerified(cleanEmail);
        otpRepository.deleteOtp(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);

        String canonicalUserId = "local:" + cleanEmail;
        Map<String, Object> userDoc = userRepository.getUser(canonicalUserId);
        if (userDoc == null) {
            String username = buildUsername(cleanEmail);
            userDoc = userRepository.provisionOrUpdateOAuthUser(
                    "local",
                    cleanEmail,
                    username,
                    username,
                    "https://api.dicebear.com/7.x/identicon/svg?seed="
                            + URLEncoder.encode(cleanEmail, StandardCharsets.UTF_8),
                    "",
                    cleanEmail
            );
        }

        return buildAuthenticatedResponse(canonicalUserId, cleanEmail, userDoc, true);
    }

    public Map<String, Object> resendVerificationOtp(String rawEmail) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);

        Document cred = credentialRepository.findByEmail(cleanEmail);
        if (cred == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for this email.");
        }
        if (Boolean.TRUE.equals(cred.getBoolean("email_verified"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already verified. Please sign in.");
        }

        enforceResendCooldown(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);
        issueAndSendOtp(cleanEmail, EmailOtpRepository.PURPOSE_VERIFICATION);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "verification_required");
        response.put("requires_verification", true);
        response.put("email", cleanEmail);
        response.put("expires_in_seconds", properties.getOtpExpiryMinutes() * 60);
        response.put("resend_cooldown_seconds", properties.getOtpResendCooldownSeconds());
        response.put("message", "A new verification code has been sent to " + cleanEmail + ".");
        return response;
    }

    public Map<String, Object> login(String rawEmail, String rawPassword) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }

        enforceLoginRateLimit(cleanEmail);

        Document cred = credentialRepository.findByEmail(cleanEmail);
        String storedHash = cred != null ? cred.getString("password_hash") : null;
        if (cred == null || storedHash == null || !passwordEncoder.matches(rawPassword, storedHash)) {
            recordFailedLogin(cleanEmail);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        failedLogins.remove(cleanEmail);

        if (!Boolean.TRUE.equals(cred.getBoolean("email_verified"))) {
            throw new EmailNotVerifiedException(
                    cleanEmail,
                    "Your email address is not verified yet. Enter the 6-digit code sent to your inbox."
            );
        }

        String canonicalUserId = cred.getString("user_id");
        if (canonicalUserId == null || canonicalUserId.isBlank()) {
            canonicalUserId = "local:" + cleanEmail;
        }

        Map<String, Object> userDoc = userRepository.getUser(canonicalUserId);
        if (userDoc == null) {
            String username = buildUsername(cleanEmail);
            userDoc = userRepository.provisionOrUpdateOAuthUser(
                    "local",
                    cleanEmail,
                    username,
                    username,
                    "https://api.dicebear.com/7.x/identicon/svg?seed="
                            + URLEncoder.encode(cleanEmail, StandardCharsets.UTF_8),
                    "",
                    cleanEmail
            );
        }

        return buildAuthenticatedResponse(canonicalUserId, cleanEmail, userDoc, true);
    }

    public Map<String, Object> forgotPassword(String rawEmail) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);

        if (!emailDeliveryService.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured on this server. Set RESEND_API_KEY or SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD."
            );
        }

        Document cred = credentialRepository.findByEmail(cleanEmail);
        if (cred != null) {
            enforceResendCooldown(cleanEmail, EmailOtpRepository.PURPOSE_PASSWORD_RESET);
            issueAndSendOtp(cleanEmail, EmailOtpRepository.PURPOSE_PASSWORD_RESET);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("email", cleanEmail);
        response.put("expires_in_seconds", properties.getOtpExpiryMinutes() * 60);
        response.put("resend_cooldown_seconds", properties.getOtpResendCooldownSeconds());
        response.put("message", "If an account exists for " + cleanEmail + ", a verification code has been sent.");
        return response;
    }

    public Map<String, Object> resetPassword(String rawEmail, String rawOtp, String rawNewPassword) {
        String cleanEmail = normalizeAndValidateEmail(rawEmail);
        String cleanOtp = normalizeOtp(rawOtp);
        validatePasswordStrength(rawNewPassword);

        Document cred = credentialRepository.findByEmail(cleanEmail);
        if (cred == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired password reset code.");
        }

        verifyOtpCode(cleanEmail, EmailOtpRepository.PURPOSE_PASSWORD_RESET, cleanOtp);

        String newHash = passwordEncoder.encode(rawNewPassword);
        credentialRepository.updatePasswordHash(cleanEmail, newHash);
        // Proving inbox access via reset OTP also verifies ownership of the email address
        credentialRepository.markEmailVerified(cleanEmail);
        otpRepository.deleteOtp(cleanEmail, EmailOtpRepository.PURPOSE_PASSWORD_RESET);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("message", "Password has been reset successfully. You can now sign in.");
        return response;
    }

    private void issueAndSendOtp(String cleanEmail, String purpose) {
        int codeNum = secureRandom.nextInt(1_000_000);
        String otpCode = String.format(Locale.ROOT, "%06d", codeNum);
        String otpHash = hashOtp(cleanEmail, purpose, otpCode);

        Instant now = Instant.now();
        int expiryMinutes = Math.max(1, properties.getOtpExpiryMinutes());
        Instant expiresAt = now.plus(Duration.ofMinutes(expiryMinutes));

        otpRepository.saveOtp(cleanEmail, purpose, otpHash, expiresAt, now);
        emailDeliveryService.sendOtpEmail(cleanEmail, otpCode, purpose, expiryMinutes);
    }

    private void enforceResendCooldown(String cleanEmail, String purpose) {
        Document existing = otpRepository.findOtp(cleanEmail, purpose);
        if (existing == null) {
            return;
        }
        int cooldownSeconds = Math.max(0, properties.getOtpResendCooldownSeconds());
        if (cooldownSeconds == 0) {
            return;
        }
        Object sentObj = existing.get("last_sent_at");
        Instant lastSent = toInstant(sentObj);
        if (lastSent != null) {
            long elapsed = Duration.between(lastSent, Instant.now()).getSeconds();
            long remaining = cooldownSeconds - elapsed;
            if (remaining > 0) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait " + remaining + " seconds before requesting a new verification code."
                );
            }
        }
    }

    private void verifyOtpCode(String cleanEmail, String purpose, String cleanOtp) {
        Document otpDoc = otpRepository.findOtp(cleanEmail, purpose);
        if (otpDoc == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No active verification code found. Please request a new code."
            );
        }

        Instant expiresAt = toInstant(otpDoc.get("expires_at"));
        if (expiresAt == null || Instant.now().isAfter(expiresAt)) {
            otpRepository.deleteOtp(cleanEmail, purpose);
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Verification code has expired. Please request a new code."
            );
        }

        int maxAttempts = Math.max(1, properties.getOtpMaxAttempts());
        String expectedHash = otpDoc.getString("otp_hash");
        String actualHash = hashOtp(cleanEmail, purpose, cleanOtp);

        byte[] expectedBytes = expectedHash != null ? expectedHash.getBytes(StandardCharsets.UTF_8) : new byte[0];
        byte[] actualBytes = actualHash.getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedBytes, actualBytes)) {
            int attempts = otpRepository.incrementAttempts(cleanEmail, purpose);
            if (attempts >= maxAttempts) {
                otpRepository.deleteOtp(cleanEmail, purpose);
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many incorrect attempts. Please request a new verification code."
                );
            }
            int remaining = maxAttempts - attempts;
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid verification code. " + remaining + " attempt(s) remaining."
            );
        }
    }

    private String hashOtp(String cleanEmail, String purpose, String otpCode) {
        String secret = properties.getAppJwtSecret();
        String message = cleanEmail + "|" + purpose + "|" + otpCode;
        try {
            if (secret != null && !secret.isBlank()) {
                Mac mac = Mac.getInstance("HmacSHA256");
                SecretKeySpec keySpec = new SecretKeySpec(secret.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
                mac.init(keySpec);
                return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(message.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash verification code.", e);
        }
    }

    private Map<String, Object> buildAuthenticatedResponse(
            String canonicalUserId,
            String cleanEmail,
            Map<String, Object> userDoc,
            boolean emailVerified
    ) {
        String username = buildUsername(cleanEmail);
        String displayName = username;
        boolean onboardingCompleted = false;

        if (userDoc != null) {
            if (userDoc.get("identity") instanceof Map<?, ?> identity) {
                if (identity.get("username") != null && !identity.get("username").toString().isBlank()) {
                    username = identity.get("username").toString();
                }
                if (identity.get("display_name") != null && !identity.get("display_name").toString().isBlank()) {
                    displayName = identity.get("display_name").toString();
                }
            }
            Object onbObj = userDoc.get("onboarding_completed");
            if (onbObj instanceof Boolean b) {
                onboardingCompleted = b;
            }
        }

        String jwt = tokenService.issueToken(
                canonicalUserId,
                username,
                List.of("ROLE_USER"),
                Map.of("provider", "local", "email", cleanEmail, "display_name", displayName)
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("token_type", "Bearer");
        response.put("access_token", jwt);
        response.put("expires_in", properties.getAppJwtExpirationSeconds());
        response.put("user_id", canonicalUserId);
        response.put("email_verified", emailVerified);
        response.put("onboarding_completed", onboardingCompleted);
        return response;
    }

    private String normalizeAndValidateEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }
        String cleanEmail = rawEmail.trim().toLowerCase(Locale.ROOT);
        if (!EMAIL_PATTERN.matcher(cleanEmail).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address.");
        }
        return cleanEmail;
    }

    private void validatePasswordStrength(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }
        if (rawPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least " + MIN_PASSWORD_LENGTH + " characters."
            );
        }
    }

    private String normalizeOtp(String rawOtp) {
        if (rawOtp == null || rawOtp.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is required.");
        }
        String digits = rawOtp.trim().replaceAll("\\s+", "");
        if (!digits.matches("^\\d{6}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code must be 6 digits.");
        }
        return digits;
    }

    private String buildDisplayName(String firstName, String lastName, String cleanEmail) {
        String f = firstName != null ? firstName.trim() : "";
        String l = lastName != null ? lastName.trim() : "";
        String combined = (f + " " + l).trim();
        return combined.isBlank() ? cleanEmail.split("@")[0] : combined;
    }

    private String buildUsername(String cleanEmail) {
        String localPart = cleanEmail.split("@")[0].replaceAll("[^a-zA-Z0-9_-]", "");
        return localPart.isBlank() ? "contributor" : localPart;
    }

    private void enforceLoginRateLimit(String cleanEmail) {
        FailedLoginWindow window = failedLogins.get(cleanEmail);
        if (window == null) {
            return;
        }
        if (Duration.between(window.windowStart(), Instant.now()).compareTo(LOGIN_WINDOW) >= 0) {
            failedLogins.remove(cleanEmail);
            return;
        }
        if (window.count() >= MAX_LOGIN_ATTEMPTS) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed sign-in attempts. Please wait 15 minutes before trying again or reset your password."
            );
        }
    }

    private void recordFailedLogin(String cleanEmail) {
        Instant now = Instant.now();
        if (failedLogins.size() > 10_000) {
            failedLogins.entrySet().removeIf(e -> Duration.between(e.getValue().windowStart(), now).compareTo(LOGIN_WINDOW) >= 0);
        }
        failedLogins.compute(cleanEmail, (k, existing) -> {
            if (existing == null || Duration.between(existing.windowStart(), now).compareTo(LOGIN_WINDOW) >= 0) {
                return new FailedLoginWindow(1, now);
            }
            return new FailedLoginWindow(existing.count() + 1, existing.windowStart());
        });
    }

    private Instant toInstant(Object dateObj) {
        if (dateObj instanceof Date d) {
            return d.toInstant();
        }
        if (dateObj instanceof Instant i) {
            return i;
        }
        if (dateObj instanceof String s) {
            try {
                return Instant.parse(s);
            } catch (Exception ignored) {}
        }
        return null;
    }
}

