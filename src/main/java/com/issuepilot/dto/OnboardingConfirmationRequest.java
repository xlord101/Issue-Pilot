package com.issuepilot.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OnboardingConfirmationRequest {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("confirmed_skills")
    private List<SkillConfirmationDto> confirmedSkills = new ArrayList<>();

    @JsonProperty("dismissed_skills")
    private List<String> dismissedSkills = new ArrayList<>();

    private Map<String, Object> preferences = new LinkedHashMap<>();

    private Double capability;

    @JsonProperty("capability_confidence")
    private Double capabilityConfidence;

    @JsonProperty("open_source_experience")
    private String openSourceExperience;

    @JsonProperty("codebase_navigation_comfort")
    private String codebaseNavigationComfort;

    @JsonProperty("target_challenge_goal")
    private String targetChallengeGoal;

    public OnboardingConfirmationRequest() {}

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<SkillConfirmationDto> getConfirmedSkills() {
        return confirmedSkills;
    }

    public void setConfirmedSkills(List<SkillConfirmationDto> confirmedSkills) {
        this.confirmedSkills = confirmedSkills != null ? confirmedSkills : new ArrayList<>();
    }

    public List<String> getDismissedSkills() {
        return dismissedSkills;
    }

    public void setDismissedSkills(List<String> dismissedSkills) {
        this.dismissedSkills = dismissedSkills != null ? dismissedSkills : new ArrayList<>();
    }

    public Map<String, Object> getPreferences() {
        return preferences;
    }

    public void setPreferences(Map<String, Object> preferences) {
        this.preferences = preferences != null ? preferences : new LinkedHashMap<>();
    }

    public Double getCapability() {
        return capability;
    }

    public void setCapability(Double capability) {
        this.capability = capability;
    }

    public Double getCapabilityConfidence() {
        return capabilityConfidence;
    }

    public void setCapabilityConfidence(Double capabilityConfidence) {
        this.capabilityConfidence = capabilityConfidence;
    }

    public String getOpenSourceExperience() {
        return openSourceExperience;
    }

    public void setOpenSourceExperience(String openSourceExperience) {
        this.openSourceExperience = openSourceExperience;
    }

    public String getCodebaseNavigationComfort() {
        return codebaseNavigationComfort;
    }

    public void setCodebaseNavigationComfort(String codebaseNavigationComfort) {
        this.codebaseNavigationComfort = codebaseNavigationComfort;
    }

    public String getTargetChallengeGoal() {
        return targetChallengeGoal;
    }

    public void setTargetChallengeGoal(String targetChallengeGoal) {
        this.targetChallengeGoal = targetChallengeGoal;
    }
}
