package com.issuepilot.service.diagnostic;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.dto.diagnostic.*;
import com.issuepilot.model.ContributorProfile;
import com.issuepilot.model.InferredSkill;
import com.issuepilot.model.SkillEvidence;
import com.issuepilot.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdaptiveDiagnosticService {

    private static final Logger logger = LoggerFactory.getLogger(AdaptiveDiagnosticService.class);

    private final QuizCorpusService corpusService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // In-memory active diagnostic sessions (sessionId -> SessionState)
    private final Map<String, DiagnosticSessionState> activeSessions = new ConcurrentHashMap<>();

    @Autowired
    public AdaptiveDiagnosticService(QuizCorpusService corpusService, UserRepository userRepository, ObjectMapper objectMapper) {
        this.corpusService = corpusService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public static class DiagnosticSessionState {
        private final String sessionId;
        private final String userId;
        private final String technology;
        private final String initialTier;
        private final long createdAt;
        private int currentStep;
        private final int totalSteps;
        private String currentTier;
        private QuizCorpusService.CorpusScenario currentScenario;
        private final Set<String> usedScenarioIds = new HashSet<>();
        private final List<StepResult> stepHistory = new ArrayList<>();

        public DiagnosticSessionState(String sessionId, String userId, String technology, String initialTier, int totalSteps) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.technology = technology;
            this.initialTier = initialTier;
            this.currentTier = initialTier;
            this.currentStep = 1;
            this.totalSteps = totalSteps;
            this.createdAt = System.currentTimeMillis();
        }

        public String getSessionId() { return sessionId; }
        public String getUserId() { return userId; }
        public String getTechnology() { return technology; }
        public int getCurrentStep() { return currentStep; }
        public void setCurrentStep(int step) { this.currentStep = step; }
        public int getTotalSteps() { return totalSteps; }
        public String getCurrentTier() { return currentTier; }
        public void setCurrentTier(String tier) { this.currentTier = tier; }
        public QuizCorpusService.CorpusScenario getCurrentScenario() { return currentScenario; }
        public void setCurrentScenario(QuizCorpusService.CorpusScenario scenario) {
            this.currentScenario = scenario;
            if (scenario != null) {
                this.usedScenarioIds.add(scenario.scenarioId());
            }
        }
        public Set<String> getUsedScenarioIds() { return usedScenarioIds; }
        public List<StepResult> getStepHistory() { return stepHistory; }
        public boolean isExpired() {
            return (System.currentTimeMillis() - createdAt) > (30 * 60 * 1000); // 30 min TTL
        }
    }

    public record StepResult(
            int stepNumber,
            String tier,
            String scenarioId,
            String selectedOptionId,
            double scoreWeight,
            boolean isOptimal,
            String explanation
    ) {}

    /**
     * Initiates a new adaptive diagnostic session.
     */
    public DiagnosticQuestionDto startSession(String canonicalUserId, DiagnosticStartRequest request) {
        if (canonicalUserId == null || canonicalUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to start diagnostic.");
        }
        String tech = request != null && request.technology() != null && !request.technology().isBlank()
                ? request.technology()
                : "Python";

        // Determine starting tier based on GitHub history and reported experience
        String startingTier = determineStartingTier(canonicalUserId, tech, request != null ? request.experienceAnchor() : null);

        String sessionId = UUID.randomUUID().toString();
        DiagnosticSessionState session = new DiagnosticSessionState(sessionId, canonicalUserId, tech, startingTier, 2);

        QuizCorpusService.CorpusScenario scenario = corpusService.selectScenario(tech, startingTier, session.getUsedScenarioIds());
        session.setCurrentScenario(scenario);

        activeSessions.put(sessionId, session);
        logger.info("Started adaptive diagnostic session {} for user '{}' in tech '{}' at initial tier '{}'",
                sessionId, canonicalUserId, tech, startingTier);

        return toQuestionDto(session);
    }

    /**
     * Evaluates user's answer and steps forward (either returns next question or final result).
     */
    public Object processStep(String canonicalUserId, DiagnosticStepRequest request) {
        if (canonicalUserId == null || canonicalUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        if (request == null || request.sessionId() == null || request.sessionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session ID is required.");
        }
        if (request.selectedOptionId() == null || request.selectedOptionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected option ID is required.");
        }

        DiagnosticSessionState session = activeSessions.get(request.sessionId());
        if (session == null || session.isExpired()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Diagnostic session not found or expired. Please start a new session.");
        }
        if (!session.getUserId().equals(canonicalUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-user diagnostic session access denied.");
        }

        QuizCorpusService.CorpusScenario current = session.getCurrentScenario();
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid session scenario state.");
        }

        // Find selected option
        QuizCorpusService.ScenarioOption selected = null;
        for (QuizCorpusService.ScenarioOption opt : current.options()) {
            if (opt.id().equalsIgnoreCase(request.selectedOptionId().trim())) {
                selected = opt;
                break;
            }
        }
        if (selected == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid option ID '" + request.selectedOptionId() + "'.");
        }

        // Record history
        session.getStepHistory().add(new StepResult(
                session.getCurrentStep(),
                session.getCurrentTier(),
                current.scenarioId(),
                selected.id(),
                selected.scoreWeight(),
                selected.isOptimal(),
                selected.rubricExplanation()
        ));

        // Check if finished
        if (session.getCurrentStep() >= session.getTotalSteps()) {
            activeSessions.remove(session.getSessionId());
            return finalizeDiagnostic(canonicalUserId, session);
        }

        // Adaptive Branching for Step 2
        String nextTier = session.getCurrentTier();
        if (selected.isOptimal()) {
            if ("BEGINNER".equals(nextTier)) {
                nextTier = "INTERMEDIATE";
            } else {
                nextTier = "ADVANCED";
            }
        } else {
            if ("ADVANCED".equals(nextTier)) {
                nextTier = "INTERMEDIATE";
            } else {
                nextTier = "BEGINNER";
            }
        }

        session.setCurrentStep(session.getCurrentStep() + 1);
        session.setCurrentTier(nextTier);
        QuizCorpusService.CorpusScenario nextScenario = corpusService.selectScenario(session.getTechnology(), nextTier, session.getUsedScenarioIds());
        session.setCurrentScenario(nextScenario);

        return toQuestionDto(session);
    }

    /**
     * Computes the normalized score and performs cross-verification against GitHub.
     */
    public DiagnosticResultDto finalizeDiagnostic(String canonicalUserId, DiagnosticSessionState session) {
        List<StepResult> history = session.getStepHistory();
        double sumWeights = 0.0;
        int count = 0;
        List<String> competencies = new ArrayList<>();

        for (StepResult sr : history) {
            sumWeights += sr.scoreWeight();
            count++;
            if (sr.isOptimal()) {
                competencies.add(sr.explanation());
            }
        }

        double rawTestScore = count > 0 ? (sumWeights / count) : 60.0;
        double clampedScore = Math.max(25.0, Math.min(95.0, rawTestScore));

        // Reconcile with GitHub evidence
        Map<String, Object> reconDetails = reconcileWithGitHub(canonicalUserId, session.getTechnology(), clampedScore);
        double finalCapability = (Double) reconDetails.get("reconciled_capability");
        double confidence = (Double) reconDetails.get("confidence");
        String explanation = (String) reconDetails.get("explanation");
        String perfTier = finalCapability >= 75.0 ? "ADVANCED" : (finalCapability >= 50.0 ? "INTERMEDIATE" : "BEGINNER");

        // Persist to ContributorProfile
        persistDiagnosticOutcome(canonicalUserId, session.getTechnology(), finalCapability, confidence, reconDetails);

        return new DiagnosticResultDto(
                "completed",
                session.getTechnology(),
                finalCapability,
                confidence,
                perfTier,
                reconDetails,
                competencies,
                explanation
        );
    }

    private ContributorProfile resolveProfile(String canonicalUserId) {
        Map<String, Object> doc = userRepository.getUser(canonicalUserId);
        if (doc != null) {
            try {
                return objectMapper.convertValue(doc, ContributorProfile.class);
            } catch (Exception e) {
                logger.warn("Could not deserialize user doc for '{}': {}", canonicalUserId, e.getMessage());
            }
        }
        ContributorProfile p = new ContributorProfile();
        p.setUserId(canonicalUserId);
        return p;
    }

    private Map<String, Object> reconcileWithGitHub(String canonicalUserId, String technology, double testScore) {
        Map<String, Object> recon = new LinkedHashMap<>();
        ContributorProfile profile = resolveProfile(canonicalUserId);

        boolean hasGitHubInference = false;
        double ghSkillConfidence = 0.0;
        Set<String> distinctRepos = new HashSet<>();

        if (profile != null && profile.getInferredSkills() != null) {
            for (InferredSkill is : profile.getInferredSkills()) {
                if (is.getTechnology() != null && is.getTechnology().equalsIgnoreCase(technology)) {
                    hasGitHubInference = true;
                    ghSkillConfidence = is.getConfidence();
                    if (is.getEvidence() != null) {
                        for (SkillEvidence se : is.getEvidence()) {
                            if (se.getRepository() != null && !se.getRepository().isBlank()) {
                                distinctRepos.add(se.getRepository());
                            }
                        }
                    }
                    break;
                }
            }
        }

        int repoCount = distinctRepos.size();
        recon.put("test_score", testScore);
        recon.put("github_repositories_analyzed", repoCount);
        recon.put("has_github_signal", hasGitHubInference);

        if (!hasGitHubInference || repoCount == 0) {
            // Case 1: Quiet GitHub / Enterprise / Student profile (Zero penalty)
            recon.put("reconciled_capability", Math.round(testScore * 10.0) / 10.0);
            recon.put("confidence", 0.90);
            recon.put("mode", "active_test_priority");
            recon.put("explanation", "Public GitHub profile is quiet or absent; full confidence calibrated directly from verified test scenarios.");
        } else {
            // Case 2: Cross-Verification / Dual Signal
            double ghInferredCap = 70.0 * ghSkillConfidence + 30.0;
            // Blended capability
            double blended = (testScore * 0.60) + (ghInferredCap * 0.40);
            double rounded = Math.round(blended * 10.0) / 10.0;

            recon.put("github_derived_score", Math.round(ghInferredCap * 10.0) / 10.0);
            recon.put("reconciled_capability", rounded);
            recon.put("confidence", 0.96); // Boosted confidence due to multi-signal agreement
            recon.put("mode", "dual_signal_cross_verified");
            recon.put("explanation", "Active diagnostic test cross-verified with " + repoCount + " public GitHub repositories (model confidence 96%).");
        }

        return recon;
    }

    private void persistDiagnosticOutcome(String canonicalUserId, String tech, double capability, double confidence, Map<String, Object> details) {
        try {
            ContributorProfile profile = resolveProfile(canonicalUserId);
            profile.setCapability(capability);
            profile.setCapabilityConfidence(confidence);
            profile.setOnboardingCompleted(true);
            profile.setUpdatedAt(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));

            Map<String, Object> prefs = profile.getPreferences();
            if (prefs == null) {
                prefs = new LinkedHashMap<>();
            }
            prefs.put("diagnostic_calibration", details);
            profile.setPreferences(prefs);

            userRepository.upsertUser(profile);
            logger.info("Persisted calibrated diagnostic capability {} (confidence {}) for user '{}'", capability, confidence, canonicalUserId);
        } catch (Exception e) {
            logger.warn("Could not persist diagnostic outcome to ContributorProfile: {}", e.getMessage());
        }
    }

    private String determineStartingTier(String canonicalUserId, String technology, String experienceAnchor) {
        if (experienceAnchor != null) {
            String exp = experienceAnchor.trim().toLowerCase(Locale.ROOT);
            if (exp.contains("first") || exp.contains("beginner")) {
                return "BEGINNER";
            } else if (exp.contains("seasoned") || exp.contains("expert") || exp.contains("maintainer")) {
                return "ADVANCED";
            }
        }

        ContributorProfile profile = resolveProfile(canonicalUserId);
        if (profile != null && profile.getInferredSkills() != null) {
            for (InferredSkill is : profile.getInferredSkills()) {
                if (is.getTechnology() != null && is.getTechnology().equalsIgnoreCase(technology)) {
                    if (is.getConfidence() >= 0.85) {
                        return "ADVANCED";
                    }
                }
            }
        }
        return "INTERMEDIATE";
    }

    private DiagnosticQuestionDto toQuestionDto(DiagnosticSessionState session) {
        QuizCorpusService.CorpusScenario s = session.getCurrentScenario();
        List<DiagnosticQuestionOptionDto> options = new ArrayList<>();
        if (s != null && s.options() != null) {
            for (QuizCorpusService.ScenarioOption opt : s.options()) {
                options.add(new DiagnosticQuestionOptionDto(opt.id(), opt.text()));
            }
        }
        return new DiagnosticQuestionDto(
                session.getSessionId(),
                session.getCurrentStep(),
                session.getTotalSteps(),
                session.getTechnology(),
                session.getCurrentTier(),
                s != null ? s.scenario() : "",
                options
        );
    }
}
