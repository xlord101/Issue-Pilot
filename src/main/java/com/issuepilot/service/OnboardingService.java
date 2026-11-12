package com.issuepilot.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.adapter.TechnologyDetectionHelper;
import com.issuepilot.dto.OnboardingConfirmationRequest;
import com.issuepilot.dto.OnboardingStatusResponse;
import com.issuepilot.dto.SkillConfirmationDto;
import com.issuepilot.dto.SkillUpdateRequest;
import com.issuepilot.model.ContributorProfile;
import com.issuepilot.model.ContributorSkill;
import com.issuepilot.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service managing user-editable onboarding, skill confirmation, dismissal tracking,
 * and profile preference updates.
 *
 * Requirements:
 * - Derives acting identity strictly from validated application principal.
 * - Enforces technology normalization via TechnologyDetectionHelper.
 * - Validates skill levels (beginner, intermediate, advanced, expert) and scores [0, 100].
 * - Persists confirmed skills in ContributorProfile.skills with source "user_confirmed".
 * - Persists dismissals in ContributorProfile.dismissedSkills and prevents re-analysis overwrite.
 * - Validates onboarding completion idempotently.
 * - Prevents empty/invalid submissions from silently completing onboarding.
 */
@Service
public class OnboardingService {

    private static final Logger logger = LoggerFactory.getLogger(OnboardingService.class);

    private static final Set<String> ALLOWED_LEVELS = Set.of("beginner", "intermediate", "advanced", "expert");
    private static final Set<String> ALLOWED_CATEGORIES = Set.of("language", "framework", "library", "tool");

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public OnboardingService(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Retrieves the current onboarding summary and profile status for the user.
     */
    public OnboardingStatusResponse getOnboardingStatus(String canonicalUserId) {
        ContributorProfile profile = resolveOrCreateProfile(canonicalUserId);
        return toStatusResponse(profile);
    }

    /**
     * Submits confirmed skills, dismissed suggestions, and user preferences,
     * marking onboarding as completed upon valid submission.
     */
    public OnboardingStatusResponse confirmOnboarding(String canonicalUserId, OnboardingConfirmationRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Onboarding confirmation payload is required.");
        }

        // Cross-user spoofing safeguard
        if (request.getUserId() != null && !request.getUserId().isBlank() && !request.getUserId().trim().equals(canonicalUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Cannot submit onboarding for another user.");
        }

        ContributorProfile profile = resolveOrCreateProfile(canonicalUserId);

        List<SkillConfirmationDto> confirmedList = request.getConfirmedSkills();
        Map<String, SkillConfirmationDto> deduplicatedConfirmed = new LinkedHashMap<>();

        if (confirmedList != null) {
            for (SkillConfirmationDto dto : confirmedList) {
                if (dto == null) continue;
                String rawTech = dto.getTechnology();
                if (rawTech == null || rawTech.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Skill technology name cannot be blank.");
                }

                String normTech = TechnologyDetectionHelper.normalizeTechnology(rawTech);
                if (normTech == null || normTech.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or unrecognized technology: '" + rawTech + "'.");
                }

                validateSkillCategory(dto.getCategory());
                String level = validateAndNormalizeSkillLevel(dto.getLevel());
                double score = validateOrDeriveScore(dto.getScore(), level);

                dto.setTechnology(normTech);
                dto.setLevel(level);
                dto.setScore(score);

                // Deterministic deduplication: keep highest score or latest
                if (deduplicatedConfirmed.containsKey(normTech)) {
                    double existingScore = deduplicatedConfirmed.get(normTech).getScore();
                    if (score >= existingScore) {
                        deduplicatedConfirmed.put(normTech, dto);
                    }
                } else {
                    deduplicatedConfirmed.put(normTech, dto);
                }
            }
        }

        // Empty submission validation: must have at least one confirmed skill either in payload or in existing profile
        boolean hasExistingSkills = profile.getSkills() != null && !profile.getSkills().isEmpty();
        if (deduplicatedConfirmed.isEmpty() && !hasExistingSkills) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot complete onboarding without confirming at least one valid skill.");
        }

        // Process dismissals first
        if (request.getDismissedSkills() != null) {
            for (String dismissedRaw : request.getDismissedSkills()) {
                if (dismissedRaw == null || dismissedRaw.isBlank()) continue;
                String normDismissed = TechnologyDetectionHelper.normalizeTechnology(dismissedRaw);
                String finalDismissed = (normDismissed != null) ? normDismissed : dismissedRaw.trim();
                // If confirmed in the same request, confirmation takes precedence
                if (!deduplicatedConfirmed.containsKey(finalDismissed)) {
                    profile.dismissSkill(finalDismissed);
                }
            }
        }

        // Synchronize confirmed skills when re-calibrating:
        // Any previously confirmed skill not present in the new confirmed skills list is dismissed
        if (confirmedList != null && !deduplicatedConfirmed.isEmpty() && profile.getSkills() != null) {
            Set<String> existingKeys = new HashSet<>(profile.getSkills().keySet());
            for (String existingKey : existingKeys) {
                if (!deduplicatedConfirmed.containsKey(existingKey)) {
                    profile.dismissSkill(existingKey);
                }
            }
        }

        // Apply confirmed skills
        for (SkillConfirmationDto confirmed : deduplicatedConfirmed.values()) {
            profile.confirmSkill(confirmed.getTechnology(), confirmed.getScore(), 1.0, confirmed.getLevel());
        }

        // Process and merge preferences and behavioral anchors
        Map<String, Object> currentPrefs = profile.getPreferences();
        if (currentPrefs == null) {
            currentPrefs = new LinkedHashMap<>();
        }
        if (request.getOpenSourceExperience() != null) {
            currentPrefs.put("open_source_experience", request.getOpenSourceExperience());
        }
        if (request.getCodebaseNavigationComfort() != null) {
            currentPrefs.put("codebase_navigation_comfort", request.getCodebaseNavigationComfort());
        }
        if (request.getTargetChallengeGoal() != null) {
            currentPrefs.put("target_challenge_goal", request.getTargetChallengeGoal());
        }
        if (request.getPreferences() != null && !request.getPreferences().isEmpty()) {
            validatePreferences(request.getPreferences());
            currentPrefs.putAll(request.getPreferences());
        }
        profile.setPreferences(currentPrefs);

        // Behavioral calibration and capability derivation
        CalibratedCapabilityResult calibResult = deriveCalibratedCapability(request, profile);
        profile.setCapability(calibResult.capability());
        profile.setCapabilityConfidence(calibResult.confidence());

        if (!calibResult.details().isEmpty()) {
            Map<String, Object> prefs = profile.getPreferences();
            if (prefs == null) {
                prefs = new LinkedHashMap<>();
            }
            prefs.put("calibration", calibResult.details());
            profile.setPreferences(prefs);
        }

        // Mark onboarding completed and update timestamp
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        profile.setOnboardingCompleted(true);
        profile.setUpdatedAt(nowIso);

        userRepository.upsertUser(profile);
        logger.info("User '{}' successfully completed onboarding with {} confirmed skills. Derived capability: {} (confidence: {})",
                canonicalUserId, profile.getSkills().size(), profile.getCapability(), profile.getCapabilityConfidence());

        return toStatusResponse(profile);
    }

    /**
     * Updates or creates a confirmed skill for an authenticated user post-onboarding.
     */
    public ContributorSkill updateConfirmedSkill(String canonicalUserId, String rawTechnology, SkillUpdateRequest request) {
        if (rawTechnology == null || rawTechnology.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technology path parameter cannot be blank.");
        }
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Skill update body is required.");
        }

        String normTech = TechnologyDetectionHelper.normalizeTechnology(rawTechnology);
        if (normTech == null || normTech.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or unrecognized technology: '" + rawTechnology + "'.");
        }

        validateSkillCategory(request.getCategory());
        String level = validateAndNormalizeSkillLevel(request.getLevel());
        double score = validateOrDeriveScore(request.getScore(), level);

        ContributorProfile profile = resolveOrCreateProfile(canonicalUserId);
        profile.confirmSkill(normTech, score, 1.0, level);

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        profile.setUpdatedAt(nowIso);

        userRepository.upsertUser(profile);
        return profile.getSkills().get(normTech);
    }

    /**
     * Removes a confirmed skill from the user's profile.
     */
    public void deleteConfirmedSkill(String canonicalUserId, String rawTechnology) {
        if (rawTechnology == null || rawTechnology.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technology path parameter cannot be blank.");
        }

        String normTech = TechnologyDetectionHelper.normalizeTechnology(rawTechnology);
        String finalTech = (normTech != null) ? normTech : rawTechnology.trim();

        ContributorProfile profile = resolveOrCreateProfile(canonicalUserId);
        if (profile.getSkills() == null || !profile.getSkills().containsKey(finalTech)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Confirmed skill '" + finalTech + "' not found in profile.");
        }

        profile.getSkills().remove(finalTech);

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        profile.setUpdatedAt(nowIso);

        userRepository.upsertUser(profile);
        logger.info("Removed skill '{}' from user '{}' profile.", finalTech, canonicalUserId);
    }

    /**
     * Updates user technology preferences.
     */
    public Map<String, Object> updatePreferences(String canonicalUserId, Map<String, Object> preferences) {
        if (preferences == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferences payload cannot be null.");
        }
        validatePreferences(preferences);

        ContributorProfile profile = resolveOrCreateProfile(canonicalUserId);
        Map<String, Object> current = profile.getPreferences();
        if (current == null) {
            current = new LinkedHashMap<>();
        }
        current.putAll(preferences);
        profile.setPreferences(current);

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        profile.setUpdatedAt(nowIso);

        userRepository.upsertUser(profile);
        return profile.getPreferences();
    }

    /**
     * Retrieves the complete authenticated ContributorProfile.
     */
    public ContributorProfile getProfile(String canonicalUserId) {
        return resolveOrCreateProfile(canonicalUserId);
    }

    private ContributorProfile resolveOrCreateProfile(String canonicalUserId) {
        Map<String, Object> doc = userRepository.getUser(canonicalUserId);
        if (doc != null) {
            try {
                ContributorProfile profile = objectMapper.convertValue(doc, ContributorProfile.class);
                if (profile != null) {
                    return profile;
                }
            } catch (Exception e) {
                logger.warn("Could not parse existing profile document for user '{}': {}", canonicalUserId, e.getMessage());
            }
        }

        // Default new profile if not found
        ContributorProfile profile = new ContributorProfile();
        profile.setUserId(canonicalUserId);
        profile.setOnboardingCompleted(false);
        return profile;
    }

    private OnboardingStatusResponse toStatusResponse(ContributorProfile profile) {
        OnboardingStatusResponse res = new OnboardingStatusResponse();
        res.setUserId(profile.getUserId());
        res.setOnboardingCompleted(profile.isOnboardingCompleted());
        res.setIdentity(profile.getIdentity());
        res.setSkills(profile.getSkills() != null ? profile.getSkills() : Collections.emptyMap());
        res.setInferredSkills(profile.getInferredSkills() != null ? profile.getInferredSkills() : Collections.emptyList());
        res.setDismissedSkills(profile.getDismissedSkills() != null ? profile.getDismissedSkills() : Collections.emptySet());
        res.setPreferences(profile.getPreferences() != null ? profile.getPreferences() : Collections.emptyMap());
        res.setCapability(profile.getCapability());
        res.setCapabilityConfidence(profile.getCapabilityConfidence());
        res.setUpdatedAt(profile.getUpdatedAt());
        return res;
    }

    private String validateAndNormalizeSkillLevel(String rawLevel) {
        if (rawLevel == null || rawLevel.isBlank()) {
            return "intermediate"; // default safe level
        }
        String clean = rawLevel.trim().toLowerCase(Locale.ROOT);
        if ("proficient".equals(clean)) {
            return "advanced";
        }
        if (!ALLOWED_LEVELS.contains(clean)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid skill level: '" + rawLevel + "'. Must be one of: " + ALLOWED_LEVELS
            );
        }
        return clean;
    }

    private void validateSkillCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) return;
        String clean = rawCategory.trim().toLowerCase();
        if (!ALLOWED_CATEGORIES.contains(clean)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid skill category: '" + rawCategory + "'. Must be one of: " + ALLOWED_CATEGORIES
            );
        }
    }

    private double validateOrDeriveScore(Double rawScore, String level) {
        if (rawScore != null) {
            if (Double.isNaN(rawScore) || Double.isInfinite(rawScore) || rawScore < 0.0 || rawScore > 100.0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Skill score must be a finite number between 0.0 and 100.0."
                );
            }
            return Math.round(rawScore * 100.0) / 100.0;
        }

        // Derive deterministic baseline from selected level
        return switch (level) {
            case "beginner" -> 40.0;
            case "intermediate" -> 70.0;
            case "advanced" -> 90.0;
            case "expert" -> 95.0;
            default -> 50.0;
        };
    }

    private void validatePreferences(Map<String, Object> preferences) {
        if (preferences == null) return;
        if (preferences.size() > 25) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many preference entries. Maximum allowed is 25.");
        }
        for (Map.Entry<String, Object> entry : preferences.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isBlank() || key.length() > 64) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid preference key: must be non-blank and at most 64 characters.");
            }
            Object val = entry.getValue();
            if (val instanceof String s && s.length() > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preference value for '" + key + "' exceeds maximum length of 500 characters.");
            }
            if (val instanceof List<?> l && l.size() > 50) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preference list for '" + key + "' exceeds maximum size of 50 items.");
            }
        }
    }

    public record CalibratedCapabilityResult(
            double capability,
            double confidence,
            String derivationMethod,
            Map<String, Object> details
    ) {}

    public CalibratedCapabilityResult deriveCalibratedCapability(
            OnboardingConfirmationRequest request,
            ContributorProfile profile
    ) {
        if (request == null) {
            return new CalibratedCapabilityResult(
                    profile != null ? profile.getCapability() : 70.0,
                    profile != null ? profile.getCapabilityConfidence() : 0.85,
                    "default_fallback",
                    Collections.emptyMap()
            );
        }

        // Case 1: Direct numeric capability override
        if (request.getCapability() != null) {
            double cap = request.getCapability();
            if (Double.isNaN(cap) || Double.isInfinite(cap) || cap < 0.0 || cap > 100.0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capability must be a finite number between 0.0 and 100.0.");
            }
            double conf = 0.90;
            if (request.getCapabilityConfidence() != null) {
                double reqConf = request.getCapabilityConfidence();
                if (!Double.isNaN(reqConf) && !Double.isInfinite(reqConf) && reqConf >= 0.0 && reqConf <= 1.0) {
                    conf = reqConf;
                }
            }
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("method", "explicit_override");
            details.put("explicit_capability", cap);
            details.put("confidence", conf);
            return new CalibratedCapabilityResult(cap, conf, "explicit_override", details);
        }

        // Case 2: Behavioral 3-Question Calibration
        String expRaw = request.getOpenSourceExperience();
        String navRaw = request.getCodebaseNavigationComfort();
        String goalRaw = request.getTargetChallengeGoal();

        boolean hasBehavioral = (expRaw != null && !expRaw.isBlank())
                || (navRaw != null && !navRaw.isBlank())
                || (goalRaw != null && !goalRaw.isBlank());

        if (hasBehavioral) {
            // 1. Base Anchor from Open-Source Experience
            double baseAnchor = 50.0;
            double confidence = 0.85;
            String normalizedExp = (expRaw != null) ? expRaw.trim().toLowerCase(Locale.ROOT) : "unspecified";

            if (normalizedExp.contains("first_time") || normalizedExp.contains("none") || normalizedExp.contains("beginner") || normalizedExp.contains("never") || normalizedExp.contains("zero")) {
                baseAnchor = 30.0;
                confidence = 0.85;
            } else if (normalizedExp.contains("familiar") || normalizedExp.contains("some") || normalizedExp.contains("intermediate") || normalizedExp.contains("pr") || normalizedExp.contains("occasional") || normalizedExp.contains("1-3")) {
                baseAnchor = 55.0;
                confidence = 0.90;
            } else if (normalizedExp.contains("seasoned") || normalizedExp.contains("maintainer") || normalizedExp.contains("advanced") || normalizedExp.contains("active") || normalizedExp.contains("expert") || normalizedExp.contains("regular")) {
                baseAnchor = 80.0;
                confidence = 0.95;
            }

            // 2. Navigation Comfort Modifier
            double navModifier = 0.0;
            String normalizedNav = (navRaw != null) ? navRaw.trim().toLowerCase(Locale.ROOT) : "unspecified";
            if (normalizedNav.contains("surgical") || normalizedNav.contains("isolated") || normalizedNav.contains("single") || normalizedNav.contains("small")) {
                navModifier = -5.0;
            } else if (normalizedNav.contains("architectural") || normalizedNav.contains("full") || normalizedNav.contains("modular") || normalizedNav.contains("multi") || normalizedNav.contains("large") || normalizedNav.contains("complex")) {
                navModifier = 10.0;
            }

            // 3. Goal Range Clamping
            double minClamp = 0.0;
            double maxClamp = 100.0;
            String normalizedGoal = (goalRaw != null) ? goalRaw.trim().toLowerCase(Locale.ROOT) : "unspecified";
            if (normalizedGoal.contains("quick_win") || normalizedGoal.contains("good_first") || normalizedGoal.contains("starter") || normalizedGoal.contains("doc") || normalizedGoal.contains("typo")) {
                minClamp = 25.0;
                maxClamp = 45.0;
            } else if (normalizedGoal.contains("deep_dive") || normalizedGoal.contains("bug") || normalizedGoal.contains("reproducible") || normalizedGoal.contains("normal")) {
                minClamp = 40.0;
                maxClamp = 65.0;
            } else if (normalizedGoal.contains("high_impact") || normalizedGoal.contains("feature") || normalizedGoal.contains("architect") || normalizedGoal.contains("refactor") || normalizedGoal.contains("advanced")) {
                minClamp = 65.0;
                maxClamp = 90.0;
            }

            double rawScore = baseAnchor + navModifier;
            double calibratedCap = Math.max(minClamp, Math.min(maxClamp, rawScore));

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("method", "behavioral_calibration");
            details.put("open_source_experience", normalizedExp);
            details.put("codebase_navigation_comfort", normalizedNav);
            details.put("target_challenge_goal", normalizedGoal);
            details.put("base_anchor", baseAnchor);
            details.put("navigation_modifier", navModifier);
            details.put("raw_score", rawScore);
            details.put("clamped_range", List.of(minClamp, maxClamp));
            details.put("calibrated_capability", calibratedCap);
            details.put("confidence", confidence);

            return new CalibratedCapabilityResult(calibratedCap, confidence, "behavioral_calibration", details);
        }

        // Case 3: Retain existing or default
        double cap = (profile != null) ? profile.getCapability() : 70.0;
        double conf = (profile != null) ? profile.getCapabilityConfidence() : 0.85;
        return new CalibratedCapabilityResult(cap, conf, "preserved_existing", Collections.emptyMap());
    }
}

