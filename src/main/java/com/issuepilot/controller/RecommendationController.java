package com.issuepilot.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.AppProperties;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.model.RankingWeights;
import com.issuepilot.repository.IssueRepository;
import com.issuepilot.repository.RecommendationRepository;
import com.issuepilot.repository.UserRepository;
import com.issuepilot.security.UserIdentityResolver;
import com.issuepilot.service.CppRankingClient;
import com.issuepilot.service.LiveVerifier;
import com.issuepilot.service.TechnologyMatchingService;
import com.issuepilot.model.ContributorProfile;
import com.issuepilot.model.IssueVote;
import com.issuepilot.repository.VoteRepository;
import com.issuepilot.service.VoteAffinityService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private static final Logger logger = LoggerFactory.getLogger(RecommendationController.class);

    private final MongoConfig mongoConfig;
    private final AppProperties properties;
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final RecommendationRepository recommendationRepository;
    private final CppRankingClient cppRankingClient;
    private final LiveVerifier liveVerifier;
    private final SimulatorController simulatorController;
    private final ObjectMapper objectMapper;
    private final UserIdentityResolver userIdentityResolver;
    private final TechnologyMatchingService technologyMatchingService;
    private final VoteRepository voteRepository;
    private final VoteAffinityService voteAffinityService;

    @org.springframework.beans.factory.annotation.Autowired
    public RecommendationController(
            MongoConfig mongoConfig,
            AppProperties properties,
            IssueRepository issueRepository,
            UserRepository userRepository,
            RecommendationRepository recommendationRepository,
            CppRankingClient cppRankingClient,
            LiveVerifier liveVerifier,
            SimulatorController simulatorController,
            ObjectMapper objectMapper,
            UserIdentityResolver userIdentityResolver,
            TechnologyMatchingService technologyMatchingService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) VoteRepository voteRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) VoteAffinityService voteAffinityService
    ) {
        this.mongoConfig = mongoConfig;
        this.properties = properties;
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.recommendationRepository = recommendationRepository;
        this.cppRankingClient = cppRankingClient;
        this.liveVerifier = liveVerifier;
        this.simulatorController = simulatorController;
        this.objectMapper = objectMapper;
        this.userIdentityResolver = userIdentityResolver;
        this.technologyMatchingService = technologyMatchingService != null ? technologyMatchingService : new TechnologyMatchingService();
        this.voteRepository = voteRepository;
        this.voteAffinityService = voteAffinityService;
    }

    public RecommendationController(
            MongoConfig mongoConfig,
            AppProperties properties,
            IssueRepository issueRepository,
            UserRepository userRepository,
            RecommendationRepository recommendationRepository,
            CppRankingClient cppRankingClient,
            LiveVerifier liveVerifier,
            SimulatorController simulatorController,
            ObjectMapper objectMapper,
            UserIdentityResolver userIdentityResolver,
            TechnologyMatchingService technologyMatchingService
    ) {
        this(mongoConfig, properties, issueRepository, userRepository, recommendationRepository,
                cppRankingClient, liveVerifier, simulatorController, objectMapper, userIdentityResolver,
                technologyMatchingService, null, null);
    }

    public RecommendationController(
            MongoConfig mongoConfig,
            AppProperties properties,
            IssueRepository issueRepository,
            UserRepository userRepository,
            RecommendationRepository recommendationRepository,
            CppRankingClient cppRankingClient,
            LiveVerifier liveVerifier,
            SimulatorController simulatorController,
            ObjectMapper objectMapper,
            UserIdentityResolver userIdentityResolver
    ) {
        this(mongoConfig, properties, issueRepository, userRepository, recommendationRepository,
                cppRankingClient, liveVerifier, simulatorController, objectMapper, userIdentityResolver,
                new TechnologyMatchingService(), null, null);
    }

    public static class RecommendationRequest extends com.issuepilot.model.RecommendationRequest {}

    private String resolveActingUserId(Authentication auth, String suppliedUserId) {
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String id = userIdentityResolver.resolveUserId(auth);
            if (id != null) return id;
        }
        Authentication secAuth = SecurityContextHolder.getContext().getAuthentication();
        if (secAuth != null && secAuth.isAuthenticated() && !"anonymousUser".equals(secAuth.getPrincipal())) {
            String id = userIdentityResolver.resolveUserId(secAuth);
            if (id != null) return id;
        }
        return suppliedUserId;
    }

    @PostMapping("/personalized")
    public Map<String, Object> getPersonalizedRecommendations(
            @RequestBody RecommendationRequest req,
            Authentication authentication
    ) {
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required.");
        }

        String actingUserId = resolveActingUserId(authentication, req.user_id);
        if (actingUserId != null && !actingUserId.isBlank()) {
            if (req.user_id != null && !req.user_id.isBlank() && !req.user_id.equals(actingUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot request personalized recommendations for another user.");
            }
            req.user_id = actingUserId;
        }

        boolean isLive = !req.demo_mode && req.prefer_live_atlas;

        if (isLive && !mongoConfig.isConnected()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "MongoDB Atlas is unavailable. Live recommendation requires an active database connection. Set demo_mode=true or prefer_live_atlas=false to evaluate bundled demonstration candidates."
            );
        }

        // 1. Resolve Contributor Profile
        Map<String, Object> profile = null;
        if (req.profile != null) {
            profile = req.profile;
        } else if (req.user_id != null && !req.user_id.isBlank()) {
            profile = userRepository.getUser(req.user_id);
            if (profile == null) {
                // If profile not yet persisted in Atlas, construct an initial uncalibrated profile
                // instead of failing with 404 and forcing silent fallback to mock data
                ContributorProfile starter = new ContributorProfile();
                starter.setUserId(req.user_id);
                starter.setOnboardingCompleted(false);
                profile = objectMapper.convertValue(starter, new TypeReference<Map<String, Object>>() {});
            }
        } else {
            ContributorProfile starter = new ContributorProfile();
            starter.setUserId("guest");
            starter.setOnboardingCompleted(false);
            profile = objectMapper.convertValue(starter, new TypeReference<Map<String, Object>>() {});
        }

        // 2. Resolve Candidate Pool
        ContributorProfile contributorProfile = null;
        if (profile != null) {
            try {
                contributorProfile = objectMapper.convertValue(profile, ContributorProfile.class);
            } catch (Exception ignored) {}
        }

        List<Map<String, Object>> candidates = new ArrayList<>();
        String dataSource = "atlas_candidates";

        if (req.demo_mode || !req.prefer_live_atlas) {
            dataSource = "sample_demonstration_candidates";
            List<Map<String, Object>> rawSamples = new ArrayList<>(simulatorController.getSampleIssues());
            candidates = technologyMatchingService.prioritizeCandidates(rawSamples, contributorProfile, req, 100);
        } else {
            try {
                candidates = technologyMatchingService.fetchCandidatePool(
                        issueRepository,
                        contributorProfile,
                        req,
                        100
                );
            } catch (Exception e) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "MongoDB Atlas connection failure: " + e.getMessage()
                );
            }

            if (candidates.isEmpty()) {
                logger.info("No candidates matched strict user criteria; attempting fallback to recent open candidates from repository.");
                candidates = issueRepository.queryIssues("open", false, null, null, null, null, null, 20, 0);
                if (candidates.isEmpty()) {
                    throw new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "No eligible open candidates found in MongoDB Atlas matching the specified criteria. Ingest candidates first or set demo_mode=true."
                    );
                }
            }
        }

        // Resolve user's vote history once for repository muting, vote hydration, and C++ VoteAffinity re-ranking
        String voteLookupUserId = (req.user_id != null && !req.user_id.isBlank())
                ? req.user_id
                : ((profile != null && profile.get("user_id") != null) ? profile.get("user_id").toString() : null);

        List<IssueVote> userVotes = (!req.demo_mode && voteLookupUserId != null && voteRepository != null)
                ? voteRepository.getUserVotes(voteLookupUserId)
                : Collections.emptyList();

        if (!userVotes.isEmpty()) {
            Set<String> mutedRepos = extractMutedRepos(userVotes);
            if (!mutedRepos.isEmpty()) {
                List<Map<String, Object>> unmuted = candidates.stream()
                        .filter(c -> {
                            Object r = c.get("repository_full_name");
                            return r == null || !mutedRepos.contains(r.toString().trim().toLowerCase(Locale.ROOT));
                        })
                        .toList();
                if (!unmuted.isEmpty()) {
                    candidates = new ArrayList<>(unmuted);
                }
            }
        }

        // 3. Authoritative C++ Engine Scoring & Ranking
        Map<String, Object> weightsMap = req.weights != null
                ? req.weights
                : objectMapper.convertValue(new RankingWeights(), new TypeReference<Map<String, Object>>() {});

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("profile", profile);
        payload.put("weights", weightsMap);
        payload.put("candidates", candidates);

        Map<String, Object> engineResponse;
        try {
            engineResponse = cppRankingClient.executeRanking(payload);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "C++ ranking engine execution failed: " + e.getMessage()
            );
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rankedCandidates = new ArrayList<>(
                (List<Map<String, Object>>) engineResponse.getOrDefault("results", Collections.emptyList())
        );
        String modelVersion = (String) engineResponse.getOrDefault("algorithm_version", "1.0.0-phase1");

        // Preserve all candidate metadata from candidate pool
        Map<String, Map<String, Object>> lookup = new HashMap<>();
        for (Map<String, Object> c : candidates) {
            String cId = (String) c.get("id");
            if (cId != null) lookup.put(cId, c);
        }

        for (Map<String, Object> item : rankedCandidates) {
            String cId = (String) item.get("id");
            if (cId != null && lookup.containsKey(cId)) {
                Map<String, Object> orig = lookup.get(cId);
                for (Map.Entry<String, Object> e : orig.entrySet()) {
                    if (!item.containsKey(e.getKey())) {
                        item.put(e.getKey(), e.getValue());
                    }
                }
            }
            if (item.containsKey("scores") && item.get("scores") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> sc = (Map<String, Object>) item.get("scores");
                if (sc.containsKey("final_score") && !item.containsKey("final_score")) {
                    item.put("final_score", sc.get("final_score"));
                }
            }
        }

        // 3.5. Apply real-time C++ VoteAffinity personalization when user has Like/Dislike vote history
        if (!userVotes.isEmpty() && voteAffinityService != null && !rankedCandidates.isEmpty()) {
            applyVoteAffinityPersonalization(voteLookupUserId, rankedCandidates, userVotes, weightsMap);
        }

        // 4. Live Multi-Platform Verification & Shortlist Backfill
        int effectiveBudget = req.shortlist_size != null
                ? req.shortlist_size
                : (req.verification_budget > 0 ? req.verification_budget : properties.getVerificationCandidateLimit());

        int requestedOffset = (req.offset != null && req.offset > 0) ? req.offset : 0;
        int requestedLimit = req.target_count > 0 ? req.target_count : properties.getFinalRecommendationCount();
        int fetchTarget = Math.min(Math.max(requestedLimit + requestedOffset, requestedLimit), Math.max(effectiveBudget, 1));

        LiveVerifier.VerificationAndBackfillResult backfillResult = liveVerifier.verifyAndBackfill(
                rankedCandidates,
                fetchTarget,
                effectiveBudget,
                req.demo_mode || !req.prefer_live_atlas,
                req.timeout_seconds,
                req.max_retries
        );

        List<Map<String, Object>> deliveredRecs = new ArrayList<>(backfillResult.getDeliveredRecommendations());
        List<Map<String, Object>> auditedRecords = backfillResult.getAuditedRecords();
        Map<String, Object> metrics = backfillResult.getMetrics();

        // Filter by match score bounds if requested
        if (req.min_score != null || req.max_score != null) {
            double minS = req.min_score != null ? req.min_score : 0.0;
            double maxS = req.max_score != null ? req.max_score : 100.0;
            deliveredRecs.removeIf(rec -> {
                double s = extractDouble(rec.get("final_score"), 0.0);
                return s < minS || s > maxS;
            });
        }

        // Sort delivered recommendations according to user sort order
        applySortOrder(deliveredRecs, req.sort);

        // Slice pagination window [offset, offset + limit)
        boolean hasMore = deliveredRecs.size() > (requestedOffset + requestedLimit);
        int totalVerifiedAvailable = deliveredRecs.size();
        if (requestedOffset > 0 || deliveredRecs.size() > requestedLimit) {
            int from = Math.min(requestedOffset, deliveredRecs.size());
            int to = Math.min(from + requestedLimit, deliveredRecs.size());
            deliveredRecs = new ArrayList<>(deliveredRecs.subList(from, to));
        }

        // Re-index delivered_rank after any score filter / sort / slice
        for (int i = 0; i < deliveredRecs.size(); i++) {
            deliveredRecs.get(i).put("delivered_rank", requestedOffset + i + 1);
        }

        // Enrich with explainable technology matching + vote affinity reasons + vote hydration
        Map<String, IssueVote> votesByKey = buildVoteLookup(userVotes);
        for (Map<String, Object> rec : deliveredRecs) {
            if (contributorProfile != null) {
                technologyMatchingService.enrichWithExplanations(rec, contributorProfile);
            }
            populateWhyRecommendedAndVoteState(rec, votesByKey);
        }
        for (Map<String, Object> rec : auditedRecords) {
            if (contributorProfile != null) {
                technologyMatchingService.enrichWithExplanations(rec, contributorProfile);
            }
            populateWhyRecommendedAndVoteState(rec, votesByKey);
        }

        // 5. Save Audit Snapshots to MongoDB Atlas for Idempotency and Reproducibility
        // Note: Demo mode is strictly isolated and does NOT persist recommendations to Atlas
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        String runId = req.run_id != null && !req.run_id.isBlank()
                ? req.run_id
                : "run_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6);

        String effectiveUserId = (req.user_id != null && !req.user_id.isBlank())
                ? req.user_id
                : ((profile != null && profile.containsKey("user_id") && profile.get("user_id") != null)
                        ? profile.get("user_id").toString()
                        : "anonymous_user");

        if (mongoConfig.isConnected() && !req.demo_mode) {
            try {
                recommendationRepository.saveRecommendations(
                        effectiveUserId,
                        deliveredRecs,
                        modelVersion,
                        runId,
                        auditedRecords
                );
            } catch (Exception e) {
                logger.warn("Could not persist recommendation snapshot to Atlas: {}", e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("run_id", runId);
        response.put("data_source", dataSource);
        response.put("algorithm_version", modelVersion);
        response.put("user_id", effectiveUserId);
        response.put("total_candidates_considered", candidates.size());
        response.put("total_ranked", rankedCandidates.size());
        response.put("shortlist_size", metrics.getOrDefault("shortlist_size", effectiveBudget));
        response.put("candidates_verified", metrics.getOrDefault("candidates_verified", 0));
        response.put("candidates_excluded", metrics.getOrDefault("candidates_excluded", 0));
        response.put("candidates_inconclusive", metrics.getOrDefault("candidates_inconclusive", 0));
        response.put("delivered_count", deliveredRecs.size());
        response.put("total_available", totalVerifiedAvailable);
        response.put("has_more", hasMore);
        response.put("next_cursor", hasMore ? String.valueOf(requestedOffset + deliveredRecs.size()) : null);
        response.put("is_partial_result", metrics.getOrDefault("is_partial_result", false));
        response.put("partial_result_reason", metrics.get("partial_result_reason"));
        response.put("duration_ms", metrics.getOrDefault("duration_ms", 0L));
        response.put("recommendations", deliveredRecs);
        response.put("verified_recommendations", deliveredRecs); // backward compatibility
        response.put("generated_at", nowIso);

        return response;
    }

    @GetMapping("/snapshots/{userId}")
    public Map<String, Object> getUserSnapshots(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication
    ) {
        String actingUserId = resolveActingUserId(authentication, userId);
        if (actingUserId != null && !actingUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot view recommendation snapshots for another user.");
        }

        if (!mongoConfig.isConnected()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "MongoDB Atlas is unavailable.");
        }
        try {
            List<Map<String, Object>> snapshots = recommendationRepository.getUserRecommendations(userId, limit);
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("snapshots", snapshots);
            res.put("count", snapshots.size());
            return res;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/runs/{runId}")
    public Map<String, Object> getRunAudit(@PathVariable String runId) {
        if (!mongoConfig.isConnected()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "MongoDB Atlas is unavailable.");
        }
        try {
            List<Map<String, Object>> records = recommendationRepository.getRunRecommendations(runId);
            List<Map<String, Object>> delivered = new ArrayList<>();
            List<Map<String, Object>> rejected = new ArrayList<>();
            List<Map<String, Object>> skipped = new ArrayList<>();
            List<Map<String, Object>> inconclusive = new ArrayList<>();

            for (Map<String, Object> r : records) {
                String d = (String) r.get("decision");
                if ("included".equals(d)) delivered.add(r);
                else if ("rejected".equals(d)) rejected.add(r);
                else if ("skipped".equals(d)) skipped.add(r);
                else if ("inconclusive".equals(d)) inconclusive.add(r);
            }

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("run_id", runId);
            res.put("total_records", records.size());
            res.put("delivered", delivered);
            res.put("rejected", rejected);
            res.put("skipped", skipped);
            res.put("inconclusive", inconclusive);
            res.put("audit_trail", records);
            return res;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Map<String, Object> getRecommendationDetail(
            @PathVariable String id,
            Authentication authentication
    ) {
        if (id == null || id.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recommendation issue ID is required.");
        }

        String actingUserId = resolveActingUserId(authentication, null);
        Map<String, Object> profile = (actingUserId != null && !actingUserId.isBlank())
                ? userRepository.getUser(actingUserId)
                : null;
        ContributorProfile contributorProfile = null;
        if (profile != null) {
            try {
                contributorProfile = objectMapper.convertValue(profile, ContributorProfile.class);
            } catch (Exception ignored) {}
        }

        Map<String, Object> issue = issueRepository.getIssueById(id.trim());
        Map<String, Object> savedSnapshot = mongoConfig.isConnected()
                ? recommendationRepository.findByIssueId(id.trim(), actingUserId)
                : null;

        if (issue == null && savedSnapshot == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recommendation '" + id + "' not found.");
        }

        // Always prefer live re-scoring with the user's current profile when the canonical issue exists
        Map<String, Object> result = null;
        if (issue != null) {
            if (profile == null) {
                ContributorProfile starter = new ContributorProfile();
                starter.setUserId(actingUserId != null ? actingUserId : "guest");
                profile = objectMapper.convertValue(starter, new TypeReference<Map<String, Object>>() {});
            }

            Map<String, Object> weightsMap = objectMapper.convertValue(new RankingWeights(), new TypeReference<Map<String, Object>>() {});
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("profile", profile);
            payload.put("weights", weightsMap);
            payload.put("candidates", List.of(issue));

            try {
                Map<String, Object> engineRes = cppRankingClient.executeRanking(payload);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> ranked = (List<Map<String, Object>>) engineRes.getOrDefault("results", Collections.emptyList());
                if (!ranked.isEmpty()) {
                    result = new LinkedHashMap<>(ranked.get(0));
                    for (Map.Entry<String, Object> e : issue.entrySet()) {
                        result.putIfAbsent(e.getKey(), e.getValue());
                    }
                    if (result.get("scores") instanceof Map<?, ?> sc && sc.get("final_score") != null) {
                        result.putIfAbsent("final_score", sc.get("final_score"));
                    }
                }
            } catch (Exception e) {
                logger.warn("Single-issue C++ detail scoring fallback check for '{}': {}", id, e.getMessage());
            }
        }

        if (result == null) {
            result = new LinkedHashMap<>(savedSnapshot != null ? savedSnapshot : issue);
        }

        List<IssueVote> userVotes = (actingUserId != null && voteRepository != null)
                ? voteRepository.getUserVotes(actingUserId)
                : Collections.emptyList();
        if (!userVotes.isEmpty() && voteAffinityService != null) {
            Map<String, Object> weightsMap = objectMapper.convertValue(new RankingWeights(), new TypeReference<Map<String, Object>>() {});
            applyVoteAffinityPersonalization(actingUserId, new ArrayList<>(List.of(result)), userVotes, weightsMap);
        }

        if (contributorProfile != null) {
            technologyMatchingService.enrichWithExplanations(result, contributorProfile);
        }
        populateWhyRecommendedAndVoteState(result, buildVoteLookup(userVotes));
        return result;
    }

    private Set<String> extractMutedRepos(List<IssueVote> votes) {
        Set<String> muted = new HashSet<>();
        for (IssueVote v : votes) {
            if (v.getVote() == -1 && "mute_repo".equalsIgnoreCase(v.getReason()) && v.getFeatureSnapshot() != null) {
                Object repoObj = v.getFeatureSnapshot().get("repository_full_name");
                if (repoObj != null && !repoObj.toString().isBlank()) {
                    muted.add(repoObj.toString().trim().toLowerCase(Locale.ROOT));
                }
            }
        }
        return muted;
    }

    private Map<String, IssueVote> buildVoteLookup(List<IssueVote> votes) {
        Map<String, IssueVote> map = new HashMap<>();
        if (votes == null) return map;
        for (IssueVote v : votes) {
            if (v.getSource() != null && v.getPlatformIssueId() != null) {
                map.put(v.getSource().toLowerCase(Locale.ROOT) + "::" + v.getPlatformIssueId(), v);
            }
        }
        return map;
    }

    private void applyVoteAffinityPersonalization(
            String userId,
            List<Map<String, Object>> rankedCandidates,
            List<IssueVote> userVotes,
            Map<String, Object> weightsMap
    ) {
        if (userVotes == null || userVotes.isEmpty() || rankedCandidates == null || rankedCandidates.isEmpty()) {
            return;
        }
        List<Map<String, Object>> affinityPayload = new ArrayList<>();
        for (Map<String, Object> item : rankedCandidates) {
            Map<String, Object> ac = new LinkedHashMap<>();
            ac.put("id", item.get("id"));
            ac.put("source", item.get("source"));
            ac.put("platform_issue_id", item.getOrDefault("source_issue_id", item.getOrDefault("native_id", item.get("id"))));
            ac.put("profile", voteAffinityService.extractFeatureSnapshot(item));
            affinityPayload.add(ac);
        }

        Map<String, Object> affinityResp = voteAffinityService.evaluateCandidateAffinity(userId, affinityPayload);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> affResults = (List<Map<String, Object>>) affinityResp.getOrDefault("results", Collections.emptyList());

        Map<String, Map<String, Object>> affById = new HashMap<>();
        for (Map<String, Object> ar : affResults) {
            if (ar.get("id") != null) {
                affById.put(ar.get("id").toString(), ar);
            }
        }

        double fbWeight = extractDouble(weightsMap.get("feedback"), 0.10);
        if (fbWeight <= 0.0) fbWeight = 0.10;

        for (Map<String, Object> item : rankedCandidates) {
            Object idObj = item.get("id");
            if (idObj == null) continue;
            Map<String, Object> aff = affById.get(idObj.toString());
            if (aff == null) continue;

            item.put("vote_affinity", aff);
            double conf = extractDouble(aff.get("confidence"), 0.0);
            if (conf <= 0.0) continue;

            double affinityScore = extractDouble(aff.get("affinity_score"), 0.0); // [-100, +100]
            double normalizedAffinity = Math.max(0.0, Math.min(100.0, 50.0 + (0.5 * affinityScore)));

            @SuppressWarnings("unchecked")
            Map<String, Object> scores = item.get("scores") instanceof Map
                    ? (Map<String, Object>) item.get("scores")
                    : new LinkedHashMap<>();
            item.put("scores", scores);

            boolean existingFbOk = Boolean.TRUE.equals(scores.get("feedback_available"));
            double existingFb = extractDouble(scores.get("feedback"), 50.0);
            double updatedFeedbackScore = existingFbOk
                    ? ((existingFb * (1.0 - 0.5 * conf)) + (normalizedAffinity * (0.5 * conf)))
                    : normalizedAffinity;
            updatedFeedbackScore = round2(Math.max(0.0, Math.min(100.0, updatedFeedbackScore)));

            scores.put("feedback", updatedFeedbackScore);
            scores.put("feedback_available", true);
            scores.put("vote_affinity_score", round2(affinityScore));
            scores.put("vote_affinity_confidence", round2(conf));

            double prevFinal = extractDouble(item.get("final_score"), extractDouble(scores.get("final_score"), 0.0));
            double delta = fbWeight * conf * (affinityScore * 0.5);
            double nextFinal = round2(Math.max(0.0, Math.min(100.0, prevFinal + delta)));

            if (Math.abs(nextFinal - prevFinal) >= 0.05) {
                item.put("previous_score", round2(prevFinal));
                item.put("final_score", nextFinal);
                scores.put("final_score", nextFinal);
            }
        }

        rankedCandidates.sort((a, b) -> {
            double sa = extractDouble(a.get("final_score"), 0.0);
            double sb = extractDouble(b.get("final_score"), 0.0);
            return Double.compare(sb, sa);
        });
        for (int i = 0; i < rankedCandidates.size(); i++) {
            rankedCandidates.get(i).put("rank", i + 1);
        }
    }

    private void populateWhyRecommendedAndVoteState(Map<String, Object> rec, Map<String, IssueVote> votesByKey) {
        if (rec == null) return;

        // Expose canonical platform issue ID for reliable vote actions
        String source = rec.get("source") != null ? rec.get("source").toString().toLowerCase(Locale.ROOT) : "github";
        String canonicalIssueId = rec.get("id") != null ? rec.get("id").toString() : "";
        String sourceIssueId = rec.get("source_issue_id") != null ? rec.get("source_issue_id").toString() : "";
        String nativeId = rec.get("native_id") != null ? rec.get("native_id").toString() : "";
        String issueNum = rec.get("issue_number") != null ? rec.get("issue_number").toString() : "";

        String preferredPlatformId = !canonicalIssueId.isBlank()
                ? canonicalIssueId
                : (!sourceIssueId.isBlank() ? sourceIssueId : (!nativeId.isBlank() ? nativeId : issueNum));
        rec.put("platform_issue_id", preferredPlatformId);

        // Hydrate active user vote if voted on any known identifier
        IssueVote matchedVote = null;
        for (String candKey : List.of(canonicalIssueId, sourceIssueId, nativeId, issueNum)) {
            if (!candKey.isBlank()) {
                matchedVote = votesByKey.get(source + "::" + candKey);
                if (matchedVote != null) break;
            }
        }
        if (matchedVote != null) {
            rec.put("user_vote", matchedVote.getVote());
            rec.put("user_vote_reason", matchedVote.getReason());
        }

        // Compose plain-English 'why_recommended' strictly from grounded backend signals
        List<String> parts = new ArrayList<>();
        if (rec.get("match_reasons") instanceof List<?> mr) {
            for (Object r : mr) {
                if (r != null && !r.toString().isBlank()) {
                    parts.add(r.toString());
                    if (parts.size() >= 2) break;
                }
            }
        }
        if (rec.get("vote_affinity") instanceof Map<?, ?> aff && aff.get("explanations") instanceof List<?> affExp) {
            for (Object e : affExp) {
                if (e != null) {
                    String s = e.toString();
                    if (!s.isBlank() && !s.startsWith("No preference evidence") && !s.startsWith("No vote history")) {
                        parts.add(s);
                        break;
                    }
                }
            }
        }
        if (parts.isEmpty() && rec.get("explanation") != null) {
            parts.add(rec.get("explanation").toString());
        }
        if (!parts.isEmpty()) {
            rec.put("why_recommended", String.join(" • ", parts));
        }
    }

    private void applySortOrder(List<Map<String, Object>> recs, String sortKey) {
        if (sortKey == null || sortKey.isBlank() || "score_desc".equalsIgnoreCase(sortKey)) {
            recs.sort((a, b) -> Double.compare(extractDouble(b.get("final_score"), 0.0), extractDouble(a.get("final_score"), 0.0)));
            return;
        }
        if ("freshness_desc".equalsIgnoreCase(sortKey)) {
            recs.sort((a, b) -> {
                String ua = a.get("updated_at") != null ? a.get("updated_at").toString() : "";
                String ub = b.get("updated_at") != null ? b.get("updated_at").toString() : "";
                return ub.compareTo(ua);
            });
            return;
        }
        if ("verified_desc".equalsIgnoreCase(sortKey)) {
            recs.sort((a, b) -> {
                String va = a.get("verified_at") != null ? a.get("verified_at").toString() : "";
                String vb = b.get("verified_at") != null ? b.get("verified_at").toString() : "";
                return vb.compareTo(va);
            });
        }
    }

    private double extractDouble(Object val, double fallback) {
        if (val instanceof Number n) {
            double d = n.doubleValue();
            return Double.isFinite(d) ? d : fallback;
        }
        if (val != null) {
            try {
                double d = Double.parseDouble(val.toString());
                return Double.isFinite(d) ? d : fallback;
            } catch (NumberFormatException ignored) {}
        }
        return fallback;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    // Convenience overloads for direct Java invocations
    public Map<String, Object> getPersonalizedRecommendations(RecommendationRequest req) {
        return getPersonalizedRecommendations(req, null);
    }

    public Map<String, Object> getUserSnapshots(String userId, int limit) {
        return getUserSnapshots(userId, limit, null);
    }
}
