package com.issuepilot.dto.diagnostic;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DiagnosticQuestionDto(
        @JsonProperty("session_id") String sessionId,
        @JsonProperty("question_number") int questionNumber,
        @JsonProperty("total_questions") int totalQuestions,
        @JsonProperty("technology") String technology,
        @JsonProperty("tier") String tier,
        @JsonProperty("scenario") String scenario,
        @JsonProperty("options") List<DiagnosticQuestionOptionDto> options
) {}
