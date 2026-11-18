package com.issuepilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.EnvLoader;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.dto.diagnostic.DiagnosticQuestionDto;
import com.issuepilot.dto.diagnostic.DiagnosticStartRequest;
import com.issuepilot.dto.diagnostic.DiagnosticStepRequest;
import com.issuepilot.model.ContributorProfile;
import com.issuepilot.model.InferredSkill;
import com.issuepilot.model.SkillEvidence;
import com.issuepilot.repository.UserRepository;
import com.issuepilot.security.TokenService;
import com.issuepilot.service.diagnostic.QuizCorpusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "APP_JWT_SECRET=test_very_secure_secret_key_with_at_least_32_bytes_of_entropy_12345",
        "APP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "APP_JWT_ISSUER=https://issuepilot-test.com",
        "APP_JWT_EXPIRATION_SECONDS=3600"
})
@SuppressWarnings("null")
public class AdaptiveDiagnosticQuizTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
        EnvLoader.loadEnv();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private QuizCorpusService corpusService;

    @MockitoBean
    private MongoConfig mongoConfig;

    @MockitoBean
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @MockitoBean
    private UserRepository userRepository;

    private Map<String, ContributorProfile> mockUserStore;
    private String testUserToken;
    private final String testUserId = "local:diag-user-99";

    @BeforeEach
    void setUp() {
        when(mongoConfig.isConnected()).thenReturn(false);
        mockUserStore = new HashMap<>();

        ContributorProfile profile = new ContributorProfile();
        profile.setUserId(testUserId);
        profile.setCapability(70.0);
        profile.setCapabilityConfidence(0.85);
        mockUserStore.put(testUserId, profile);

        when(userRepository.getUser(anyString())).thenAnswer(inv -> {
            String uid = inv.getArgument(0);
            ContributorProfile p = mockUserStore.get(uid);
            return p != null ? objectMapper.convertValue(p, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : null;
        });

        when(userRepository.upsertUser(any(ContributorProfile.class))).thenAnswer(inv -> {
            ContributorProfile p = inv.getArgument(0);
            mockUserStore.put(p.getUserId(), p);
            return objectMapper.convertValue(p, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        });

        testUserToken = tokenService.issueToken(testUserId, "testuser99", List.of("ROLE_USER"));
    }

    @Test
    @DisplayName("Corpus integrity: All 8 core domains are loaded with valid tiers, scenarios, and options")
    void testCorpusIntegrityAndCoverage() {
        assertTrue(corpusService.getLoadedDomainCount() >= 8, "Expected at least 8 domains loaded");

        for (String domain : List.of("Python", "TypeScript", "React", "Go", "Java", "C++", "Docker", "OSS_Workflow")) {
            for (String tier : List.of("BEGINNER", "INTERMEDIATE", "ADVANCED")) {
                List<QuizCorpusService.CorpusScenario> scenarios = corpusService.getScenarios(domain, tier);
                assertFalse(scenarios.isEmpty(), "Scenarios should not be empty for domain: " + domain + " tier: " + tier);
                for (QuizCorpusService.CorpusScenario s : scenarios) {
                    assertNotNull(s.scenarioId());
                    assertFalse(s.scenario().isBlank());
                    assertEquals(4, s.options().size(), "Each scenario must have 4 options");
                    boolean hasOptimal = s.options().stream().anyMatch(QuizCorpusService.ScenarioOption::isOptimal);
                    assertTrue(hasOptimal, "Scenario " + s.scenarioId() + " must have at least one optimal option");
                }
            }
        }
    }

    @Test
    @DisplayName("Unauthenticated requests to diagnostic endpoints return 401 Unauthorized")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"technology\":\"Python\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"session_id\":\"dummy\",\"selected_option_id\":\"A\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Starting diagnostic with 'first_time' anchor initializes at BEGINNER tier")
    void testStartInitializesBeginnerTier() throws Exception {
        DiagnosticStartRequest req = new DiagnosticStartRequest("Python", "first_time", false);

        mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session_id").isNotEmpty())
                .andExpect(jsonPath("$.question_number").value(1))
                .andExpect(jsonPath("$.total_questions").value(2))
                .andExpect(jsonPath("$.tier").value("BEGINNER"))
                .andExpect(jsonPath("$.technology").value("Python"))
                .andExpect(jsonPath("$.options.length()").value(4));
    }

    @Test
    @DisplayName("Starting diagnostic with 'seasoned' anchor initializes at ADVANCED tier")
    void testStartInitializesAdvancedTier() throws Exception {
        DiagnosticStartRequest req = new DiagnosticStartRequest("React", "seasoned", false);

        mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value("ADVANCED"))
                .andExpect(jsonPath("$.technology").value("React"));
    }

    @Test
    @DisplayName("Adaptive branching: optimal answer on INTERMEDIATE steps up to ADVANCED for Question 2")
    void testAdaptiveBranchingStepUp() throws Exception {
        DiagnosticStartRequest startReq = new DiagnosticStartRequest("Python", "familiar", false);

        MvcResult result = mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value("INTERMEDIATE"))
                .andReturn();

        DiagnosticQuestionDto q1 = objectMapper.readValue(result.getResponse().getContentAsString(), DiagnosticQuestionDto.class);
        String optimalOptionId = findOptimalOptionForScenario("Python", q1.tier(), q1.scenario());

        DiagnosticStepRequest stepReq = new DiagnosticStepRequest(q1.sessionId(), optimalOptionId);

        mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(stepReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.question_number").value(2))
                .andExpect(jsonPath("$.tier").value("ADVANCED"));
    }

    @Test
    @DisplayName("Adaptive branching: suboptimal answer on INTERMEDIATE steps down to BEGINNER for Question 2")
    void testAdaptiveBranchingStepDown() throws Exception {
        DiagnosticStartRequest startReq = new DiagnosticStartRequest("Go", "familiar", false);

        MvcResult result = mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value("INTERMEDIATE"))
                .andReturn();

        DiagnosticQuestionDto q1 = objectMapper.readValue(result.getResponse().getContentAsString(), DiagnosticQuestionDto.class);

        // Pick a non-optimal option (e.g. "B" or "D" which are suboptimal)
        DiagnosticStepRequest stepReq = new DiagnosticStepRequest(q1.sessionId(), "D");

        mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(stepReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.question_number").value(2))
                .andExpect(jsonPath("$.tier").value("BEGINNER"));
    }

    private String findOptimalOptionForScenario(String technology, String tier, String scenarioText) {
        List<QuizCorpusService.CorpusScenario> scenarios = corpusService.getScenarios(technology, tier);
        for (QuizCorpusService.CorpusScenario s : scenarios) {
            if (s.scenario().equals(scenarioText)) {
                for (QuizCorpusService.ScenarioOption opt : s.options()) {
                    if (opt.isOptimal()) {
                        return opt.id();
                    }
                }
            }
        }
        return "A";
    }

    @Test
    @DisplayName("Quiet GitHub Profile: User gets 100% of their test score without downscaling penalty")
    void testQuietGitHubReconciliation() throws Exception {
        // User has 0 public GitHub repos
        ContributorProfile profile = mockUserStore.get(testUserId);
        profile.setInferredSkills(Collections.emptyList());

        DiagnosticStartRequest startReq = new DiagnosticStartRequest("Python", "familiar", false);

        MvcResult r1 = mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk())
                .andReturn();

        DiagnosticQuestionDto q1 = objectMapper.readValue(r1.getResponse().getContentAsString(), DiagnosticQuestionDto.class);
        String opt1 = findOptimalOptionForScenario("Python", q1.tier(), q1.scenario());

        // Step 1: Answer optimal
        MvcResult r2 = mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DiagnosticStepRequest(q1.sessionId(), opt1))))
                .andExpect(status().isOk())
                .andReturn();

        DiagnosticQuestionDto q2 = objectMapper.readValue(r2.getResponse().getContentAsString(), DiagnosticQuestionDto.class);
        String opt2 = findOptimalOptionForScenario("Python", q2.tier(), q2.scenario());

        // Step 2: Answer optimal to finish
        mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DiagnosticStepRequest(q2.sessionId(), opt2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.calibrated_capability").isNumber())
                .andExpect(jsonPath("$.github_reconciliation.mode").value("active_test_priority"))
                .andExpect(jsonPath("$.confidence").value(0.90));

        // Confirm profile was updated
        ContributorProfile updated = mockUserStore.get(testUserId);
        assertTrue(updated.getCapability() >= 65.0, "Quiet senior dev should receive a solid capability score: " + updated.getCapability());
        assertTrue(updated.isOnboardingCompleted());
    }

    @Test
    @DisplayName("Dual-Signal Cross-Verification: Active test + Verified GitHub evidence boosts confidence to 0.96")
    void testDualSignalCrossVerification() throws Exception {
        // User has rich GitHub inferred skill in Python
        ContributorProfile profile = mockUserStore.get(testUserId);
        InferredSkill skill = new InferredSkill();
        skill.setTechnology("Python");
        skill.setConfidence(0.90);
        SkillEvidence e1 = new SkillEvidence("repo", "owner/repo1", null, "test");
        SkillEvidence e2 = new SkillEvidence("repo", "owner/repo2", null, "test");
        SkillEvidence e3 = new SkillEvidence("repo", "owner/repo3", null, "test");
        skill.setEvidence(List.of(e1, e2, e3));
        profile.setInferredSkills(List.of(skill));

        DiagnosticStartRequest startReq = new DiagnosticStartRequest("Python", "seasoned", true);

        MvcResult r1 = mockMvc.perform(post("/api/onboarding/diagnostic/start")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk())
                .andReturn();

        DiagnosticQuestionDto q1 = objectMapper.readValue(r1.getResponse().getContentAsString(), DiagnosticQuestionDto.class);

        // Step 1
        String opt1 = findOptimalOptionForScenario("Python", q1.tier(), q1.scenario());
        MvcResult r2 = mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DiagnosticStepRequest(q1.sessionId(), opt1))))
                .andExpect(status().isOk())
                .andReturn();

        DiagnosticQuestionDto q2 = objectMapper.readValue(r2.getResponse().getContentAsString(), DiagnosticQuestionDto.class);
        String opt2 = findOptimalOptionForScenario("Python", q2.tier(), q2.scenario());

        // Step 2
        mockMvc.perform(post("/api/onboarding/diagnostic/step")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DiagnosticStepRequest(q2.sessionId(), opt2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.github_reconciliation.mode").value("dual_signal_cross_verified"))
                .andExpect(jsonPath("$.confidence").value(0.96));
    }
}
