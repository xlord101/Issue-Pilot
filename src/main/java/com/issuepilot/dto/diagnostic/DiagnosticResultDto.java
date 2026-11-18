package com.issuepilot.dto.diagnostic;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public record DiagnosticResultDto(
        @JsonProperty("status") String status,
        @JsonProperty("technology") String technology,
        @JsonProperty("calibrated_capability") double calibratedCapability,
        @JsonProperty("confidence") double confidence,
        @JsonProperty("performance_tier") String performanceTier,
        @JsonProperty("github_reconciliation") Map<String, Object> githubReconciliation,
        @JsonProperty("verified_competencies") List<String> verifiedCompetencies,
        @JsonProperty("explanation") String explanation
) {}
