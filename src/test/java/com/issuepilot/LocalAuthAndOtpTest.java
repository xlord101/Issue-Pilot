package com.issuepilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.repository.EmailOtpRepository;
import com.issuepilot.repository.LocalCredentialRepository;
import com.issuepilot.repository.UserRepository;
import com.issuepilot.service.EmailDeliveryService;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for local Email/Password authentication, BCrypt password hashing,
 * 6-digit Email OTP verification, rate limiting, and password reset flows.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "APP_JWT_SECRET=test_very_secure_secret_key_with_at_least_32_bytes_of_entropy_12345",
        "APP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "APP_JWT_ISSUER=https://issuepilot-test.com",
        "APP_JWT_EXPIRATION_SECONDS=3600",
        "RESEND_API_KEY=",
        "SMTP_HOST=",
        "SMTP_USERNAME=",
        "SMTP_PASSWORD=",
        "OTP_EXPIRY_MINUTES=10",
        "OTP_RESEND_COOLDOWN_SECONDS=60",
        "OTP_MAX_ATTEMPTS=5"
})
@SuppressWarnings("null")
public class LocalAuthAndOtpTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LocalCredentialRepository credentialRepository;

    @Autowired
    private EmailOtpRepository otpRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private MongoConfig mongoConfig;

    @MockitoBean
    private MongoTemplate mongoTemplate;

    @MockitoSpyBean
    private EmailDeliveryService emailDeliveryService;

    @BeforeEach
    public void setup() {
        when(mongoConfig.isConnected()).thenReturn(false);
        reset(emailDeliveryService);
        // Clean common test accounts between tests
        for (String email : new String[]{
                "alice@example.com",
                "bob@example.com",
                "carol@example.com",
                "dave@example.com",
                "eve@example.com",
                "unconfigured@example.com"
        }) {
            credentialRepository.deleteByEmail(email);
            otpRepository.deleteOtp(email, EmailOtpRepository.PURPOSE_VERIFICATION);
            otpRepository.deleteOtp(email, EmailOtpRepository.PURPOSE_PASSWORD_RESET);
            userRepository.deleteUser("local:" + email);
        }
    }

    @Test
    @DisplayName("1. Register fails closed with 503 when neither Resend nor SMTP is configured")
    public void testRegisterFailsClosedWithoutMailConfig() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "first_name", "NoMail",
                "last_name", "User",
                "email", "unconfigured@example.com",
                "password", "StrongPass123!"
        ));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isServiceUnavailable());

        // Must rollback unverified credential so user isn't stuck
        assertNull(credentialRepository.findByEmail("unconfigured@example.com"));
    }

    @Test
    @DisplayName("2. Full signup -> BCrypt hash + hashed OTP -> verify OTP -> JWT auth & no password leak")
    public void testFullRegistrationAndOtpVerificationFlow() throws Exception {
        doNothing().when(emailDeliveryService).sendOtpEmail(anyString(), anyString(), anyString(), anyInt());

        String rawPassword = "SuperSecretPassword!99";
        String registerBody = objectMapper.writeValueAsString(Map.of(
                "first_name", "Alice",
                "last_name", "Developer",
                "email", "Alice@Example.com",
                "password", rawPassword
        ));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("verification_required"))
                .andExpect(jsonPath("$.requires_verification").value(true))
                .andExpect(jsonPath("$.email").value("alice@example.com"));

        // Capture OTP passed to EmailDeliveryService
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailDeliveryService, times(1))
                .sendOtpEmail(eq("alice@example.com"), otpCaptor.capture(), eq(EmailOtpRepository.PURPOSE_VERIFICATION), eq(10));
        String sentOtp = otpCaptor.getValue();
        assertTrue(sentOtp.matches("^\\d{6}$"));

        // Verify password stored in isolated repository as BCrypt hash, never plaintext
        Document cred = credentialRepository.findByEmail("alice@example.com");
        assertNotNull(cred);
        assertFalse(cred.getBoolean("email_verified", false));
        String storedHash = cred.getString("password_hash");
        assertNotEquals(rawPassword, storedHash);
        assertTrue(storedHash.startsWith("$2"));
        assertTrue(passwordEncoder.matches(rawPassword, storedHash));

        // Verify OTP is stored hashed, never plaintext
        Document otpDoc = otpRepository.findOtp("alice@example.com", EmailOtpRepository.PURPOSE_VERIFICATION);
        assertNotNull(otpDoc);
        assertNotEquals(sentOtp, otpDoc.getString("otp_hash"));

        // Login before verification with correct password returns 403 EMAIL_NOT_VERIFIED
        String loginBody = objectMapper.writeValueAsString(Map.of(
                "email", "alice@example.com",
                "password", rawPassword
        ));
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));

        // Verify OTP returns access_token
        String verifyBody = objectMapper.writeValueAsString(Map.of(
                "email", "alice@example.com",
                "otp", sentOtp
        ));
        MvcResult verifyRes = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.email_verified").value(true))
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andReturn();

        JsonNode verifyJson = objectMapper.readTree(verifyRes.getResponse().getContentAsString());
        String jwt = verifyJson.get("access_token").asText();

        // Authenticated requests succeed & NEVER expose password_hash
        MvcResult meRes = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user_id").value("local:alice@example.com"))
                .andReturn();
        assertFalse(meRes.getResponse().getContentAsString().contains("password_hash"));

        MvcResult userRes = mockMvc.perform(get("/api/users/local:alice@example.com")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn();
        assertFalse(userRes.getResponse().getContentAsString().contains("password_hash"));

        MvcResult profileRes = mockMvc.perform(get("/api/profile/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn();
        assertFalse(profileRes.getResponse().getContentAsString().contains("password_hash"));

        // Re-registering verified email is rejected with 409 Conflict
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("3. Invalid password or unknown account returns 401 and never auto-creates account on login")
    public void testLoginRejectsInvalidCredentialsWithoutAutoCreation() throws Exception {
        doNothing().when(emailDeliveryService).sendOtpEmail(anyString(), anyString(), anyString(), anyInt());

        // Unknown email must return 401 and NOT create a user
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "bob@example.com",
                                "password", "AnyPassword123!"
                        ))))
                .andExpect(status().isUnauthorized());
        assertNull(credentialRepository.findByEmail("bob@example.com"));
        assertNull(userRepository.getUser("local:bob@example.com"));

        // Register & verify Bob
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "first_name", "Bob",
                                "last_name", "Builder",
                                "email", "bob@example.com",
                                "password", "CorrectPass123!"
                        ))))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailDeliveryService).sendOtpEmail(eq("bob@example.com"), otpCaptor.capture(), anyString(), anyInt());

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "bob@example.com",
                                "otp", otpCaptor.getValue()
                        ))))
                .andExpect(status().isOk());

        // Wrong password returns 401
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "bob@example.com",
                                "password", "WrongPassword!"
                        ))))
                .andExpect(status().isUnauthorized());

        // Correct password succeeds
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "bob@example.com",
                                "password", "CorrectPass123!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }

    @Test
    @DisplayName("4. Wrong OTP attempts lock out after 5 tries and resend enforces cooldown")
    public void testOtpAttemptLimitAndResendCooldown() throws Exception {
        doNothing().when(emailDeliveryService).sendOtpEmail(anyString(), anyString(), anyString(), anyInt());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "first_name", "Carol",
                                "last_name", "Tester",
                                "email", "carol@example.com",
                                "password", "CarolSecure123!"
                        ))))
                .andExpect(status().isAccepted());

        // Resend immediately triggers 429 cooldown
        mockMvc.perform(post("/api/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "carol@example.com"))))
                .andExpect(status().isTooManyRequests());

        // 4 failed attempts return 401, 5th invalidates OTP with 429
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/verify-otp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "email", "carol@example.com",
                                    "otp", "000000"
                            ))))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "carol@example.com",
                                "otp", "000000"
                        ))))
                .andExpect(status().isTooManyRequests());

        assertNull(otpRepository.findOtp("carol@example.com", EmailOtpRepository.PURPOSE_VERIFICATION));
    }

    @Test
    @DisplayName("5. Expired OTP is rejected cleanly")
    public void testExpiredOtpRejected() throws Exception {
        doNothing().when(emailDeliveryService).sendOtpEmail(anyString(), anyString(), anyString(), anyInt());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "first_name", "Dave",
                                "last_name", "Expired",
                                "email", "dave@example.com",
                                "password", "DaveSecure123!"
                        ))))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailDeliveryService).sendOtpEmail(eq("dave@example.com"), otpCaptor.capture(), anyString(), anyInt());

        // Overwrite OTP with past expiration
        Document existing = otpRepository.findOtp("dave@example.com", EmailOtpRepository.PURPOSE_VERIFICATION);
        otpRepository.saveOtp(
                "dave@example.com",
                EmailOtpRepository.PURPOSE_VERIFICATION,
                existing.getString("otp_hash"),
                Instant.now().minusSeconds(60),
                Instant.now().minusSeconds(600)
        );

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "dave@example.com",
                                "otp", otpCaptor.getValue()
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("6. Forgot password + reset password OTP updates password hash securely")
    public void testForgotAndResetPasswordFlow() throws Exception {
        doNothing().when(emailDeliveryService).sendOtpEmail(anyString(), anyString(), anyString(), anyInt());
        doReturn(true).when(emailDeliveryService).isConfigured();

        // Register & verify Eve
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "first_name", "Eve",
                                "last_name", "Reset",
                                "email", "eve@example.com",
                                "password", "OldPassword123!"
                        ))))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> verifyOtpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailDeliveryService).sendOtpEmail(
                eq("eve@example.com"),
                verifyOtpCaptor.capture(),
                eq(EmailOtpRepository.PURPOSE_VERIFICATION),
                anyInt()
        );

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "eve@example.com",
                                "otp", verifyOtpCaptor.getValue()
                        ))))
                .andExpect(status().isOk());

        // Request password reset OTP
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "eve@example.com"))))
                .andExpect(status().isOk());

        ArgumentCaptor<String> resetOtpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailDeliveryService).sendOtpEmail(
                eq("eve@example.com"),
                resetOtpCaptor.capture(),
                eq(EmailOtpRepository.PURPOSE_PASSWORD_RESET),
                anyInt()
        );

        // Reset password
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "eve@example.com",
                                "otp", resetOtpCaptor.getValue(),
                                "new_password", "BrandNewPass999!"
                        ))))
                .andExpect(status().isOk());

        // Old password fails
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "eve@example.com",
                                "password", "OldPassword123!"
                        ))))
                .andExpect(status().isUnauthorized());

        // New password succeeds
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "eve@example.com",
                                "password", "BrandNewPass999!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }
}
