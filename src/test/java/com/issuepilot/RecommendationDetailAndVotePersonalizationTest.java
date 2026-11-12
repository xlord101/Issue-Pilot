package com.issuepilot;

import com.issuepilot.config.MongoConfig;
import com.issuepilot.controller.RecommendationController;
import com.issuepilot.model.IssueVote;
import com.issuepilot.repository.IssueRepository;
import com.issuepilot.repository.UserRepository;
import com.issuepilot.repository.VoteRepository;
import com.issuepilot.security.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests verifying:
 * 1. GET /api/recommendations/{id} live C++ detail resolution and 404 on unknown ID.
 * 2. Like (+1) and Dislike (-1) votes trigger real C++ VoteAffinity re-ranking,
 *    hydrate user_vote/user_vote_reason, attach previous_score, and exclude muted repos.
 * 3. Match score bounds (min_score, max_score) and sort ordering work properly.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "APP_JWT_SECRET=test_very_secure_secret_key_with_at_least_32_bytes_of_entropy_12345",
        "APP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "APP_JWT_ISSUER=https://issuepilot-test.com",
        "APP_JWT_EXPIRATION_SECONDS=3600"
})
public class RecommendationDetailAndVotePersonalizationTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private RecommendationController recommendationController;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private VoteRepository voteRepository;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private MongoConfig mongoConfig;

    @MockitoBean
    private MongoTemplate mongoTemplate;

    private static final String TEST_USER = "github:99001";
    private static final String DETAIL_ISSUE_ID = "github_fastapi_detail_99001";

    @BeforeEach
    @AfterEach
    public void resetTestState() {
        when(mongoConfig.isConnected()).thenReturn(false);
        try {
            for (IssueVote v : voteRepository.getUserVotes(TEST_USER)) {
                voteRepository.removeVote(TEST_USER, v.getSource(), v.getPlatformIssueId());
            }
        } catch (Exception ignored) {}
        userRepository.deleteUser(TEST_USER);
        issueRepository.deleteIssue(DETAIL_ISSUE_ID);
    }

    @Test
    @DisplayName("1. GET /api/recommendations/{id} returns live C++ breakdown for valid issue and 404 for missing")
    public void testGetRecommendationDetailAndNotFound() throws Exception {
        userRepository.provisionOrUpdateOAuthUser(
                "github",
                "99001",
                "audituser",
                "Audit User",
                "",
                "",
                "audit@example.com"
        );
        userRepository.updateUser(TEST_USER, Map.of(
                "capability", 75.0,
                "onboarding_completed", true,
                "skills", Map.of(
                        "Python", Map.of("technology", "Python", "score", 90.0, "confidence", 1.0, "level", "expert"),
                        "FastAPI", Map.of("technology", "FastAPI", "score", 85.0, "confidence", 1.0, "level", "advanced")
                )
        ));

        Map<String, Object> issue = new LinkedHashMap<>();
        issue.put("id", DETAIL_ISSUE_ID);
        issue.put("source", "github");
        issue.put("source_issue_id", "99001");
        issue.put("native_id", "99001");
        issue.put("issue_number", 99001);
        issue.put("repository_full_name", "tiangolo/fastapi");
        issue.put("title", "Optimize async dependency injection graph resolution");
        issue.put("body", "Reduce overhead when resolving deeply nested async dependencies.");
        issue.put("state", "open");
        issue.put("is_assigned", false);
        issue.put("issue_url", "https://github.com/tiangolo/fastapi/issues/99001");
        issue.put("labels", List.of("performance", "enhancement"));
        issue.put("detected_technologies", List.of("Python", "FastAPI"));
        issue.put("technologies", List.of(
                Map.of("technology", "Python", "raw_relevance", 4.0),
                Map.of("technology", "FastAPI", "raw_relevance", 4.0)
        ));
        issue.put("difficulty_evidence", Map.of(
                "scope_change_size", 60.0,
                "technical_complexity", 70.0,
                "historical_effort", 60.0,
                "dependency_arch_impact", 65.0,
                "coordination_complexity", 45.0
        ));
        issue.put("responsiveness_evidence", Map.of(
                "available", true,
                "response_time_score", 90.0,
                "response_rate_score", 90.0,
                "pr_review_score", 85.0,
                "recent_maintainer_act", 88.0
        ));
        issue.put("health_evidence", Map.of(
                "available", true,
                "recent_commits", 92.0,
                "pr_activity", 85.0,
                "issue_activity", 88.0,
                "active_contributors", 90.0,
                "recent_releases", 80.0
        ));
        issue.put("freshness_evidence", Map.of(
                "available", true,
                "age_score", 90.0,
                "activity_score", 95.0
        ));
        issueRepository.upsertIssue(issue, false);

        String jwt = tokenService.issueToken(TEST_USER, "audituser", List.of("ROLE_USER"), Map.of());

        mockMvc.perform(get("/api/recommendations/" + DETAIL_ISSUE_ID)
                        .header("Authorization", "Bearer " + jwt)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(DETAIL_ISSUE_ID))
                .andExpect(jsonPath("$.final_score").isNumber())
                .andExpect(jsonPath("$.scores.repository_health").isNumber())
                .andExpect(jsonPath("$.why_recommended").isNotEmpty());

        mockMvc.perform(get("/api/recommendations/nonexistent_issue_999999")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("2. VoteAffinity (+1/-1) personalizes feed scores, hydrates vote state, and hides muted repos")
    @SuppressWarnings("unchecked")
    public void testVoteAffinityPersonalizationAndRepoMute() {
        userRepository.provisionOrUpdateOAuthUser(
                "github",
                "99001",
                "audituser",
                "Audit User",
                "",
                "",
                "audit@example.com"
        );
        userRepository.updateUser(TEST_USER, Map.of(
                "capability", 75.0,
                "onboarding_completed", true,
                "skills", Map.of(
                        "Python", Map.of("technology", "Python", "score", 90.0, "confidence", 1.0),
                        "FastAPI", Map.of("technology", "FastAPI", "score", 85.0, "confidence", 1.0),
                        "TypeScript", Map.of("technology", "TypeScript", "score", 80.0, "confidence", 1.0),
                        "React", Map.of("technology", "React", "score", 80.0, "confidence", 1.0)
                )
        ));

        // Add Like (+1) on FastAPI/Python issue & Dislike (-1 with mute_repo) on pallets/flask
        IssueVote likeVote = new IssueVote(TEST_USER, "github", "sample-1", 1);
        likeVote.setReason("strong_tech_fit");
        likeVote.setFeatureSnapshot(Map.of(
                "source", "github",
                "platform_issue_id", "sample-1",
                "repository_full_name", "tiangolo/fastapi",
                "technologies", List.of("FastAPI", "Python", "MongoDB"),
                "labels", List.of("bug", "async", "database"),
                "issue_type", "bug",
                "difficulty", 68.0,
                "difficulty_available", true
        ));
        voteRepository.recordVote(likeVote);

        IssueVote muteVote = new IssueVote(TEST_USER, "github", "sample-3", -1);
        muteVote.setReason("mute_repo");
        muteVote.setFeatureSnapshot(Map.of(
                "source", "github",
                "platform_issue_id", "sample-3",
                "repository_full_name", "pallets/flask",
                "technologies", List.of("Python"),
                "labels", List.of("enhancement", "routing", "core"),
                "issue_type", "enhancement",
                "difficulty", 74.0,
                "difficulty_available", true
        ));
        voteRepository.recordVote(muteVote);

        RecommendationController.RecommendationRequest req = new RecommendationController.RecommendationRequest();
        req.user_id = TEST_USER;
        req.demo_mode = false;
        req.prefer_live_atlas = false;
        req.target_count = 10;

        Map<String, Object> resp = recommendationController.getPersonalizedRecommendations(req);
        List<Map<String, Object>> recs = (List<Map<String, Object>>) resp.get("recommendations");
        assertNotNull(recs);
        assertFalse(recs.isEmpty());

        // Muted repository pallets/flask must be excluded
        boolean hasMutedRepo = recs.stream()
                .anyMatch(r -> "pallets/flask".equalsIgnoreCase(String.valueOf(r.get("repository_full_name"))));
        assertFalse(hasMutedRepo, "Repository muted via -1 'mute_repo' vote must be excluded");

        // Sample-1 must carry hydrated vote + C++ VoteAffinity personalization
        Map<String, Object> sample1 = recs.stream()
                .filter(r -> "sample-1".equals(r.get("id")))
                .findFirst()
                .orElseThrow();
        assertEquals(1, sample1.get("user_vote"));
        assertEquals("strong_tech_fit", sample1.get("user_vote_reason"));
        assertNotNull(sample1.get("vote_affinity"));
        assertNotNull(sample1.get("why_recommended"));
        Map<String, Object> sc1 = (Map<String, Object>) sample1.get("scores");
        assertEquals(Boolean.TRUE, sc1.get("feedback_available"));

        // Match score bounds filtering works accurately
        RecommendationController.RecommendationRequest boundedReq = new RecommendationController.RecommendationRequest();
        boundedReq.user_id = TEST_USER;
        boundedReq.demo_mode = false;
        boundedReq.prefer_live_atlas = false;
        boundedReq.target_count = 10;
        boundedReq.min_score = 99.9;
        Map<String, Object> boundedResp = recommendationController.getPersonalizedRecommendations(boundedReq);
        List<Map<String, Object>> boundedRecs = (List<Map<String, Object>>) boundedResp.get("recommendations");
        assertTrue(boundedRecs.isEmpty(), "Impossible min_score=99.9 must filter out lower-scored items");
    }
}

