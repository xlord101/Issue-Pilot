package com.issuepilot.dto.diagnostic;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DiagnosticStepRequest(
        @JsonProperty("session_id") String sessionId,
        @JsonProperty("selected_option_id") String selectedOptionId
) {}
