package com.issuepilot.dto.diagnostic;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DiagnosticStartRequest(
        @JsonProperty("technology") String technology,
        @JsonProperty("experience_anchor") String experienceAnchor,
        @JsonProperty("github_sync") Boolean githubSync
) {}
