package com.issuepilot.dto.diagnostic;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DiagnosticQuestionOptionDto(
        @JsonProperty("id") String id,
        @JsonProperty("text") String text
) {}
