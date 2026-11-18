package com.issuepilot.controller;

import com.issuepilot.dto.diagnostic.DiagnosticQuestionDto;
import com.issuepilot.dto.diagnostic.DiagnosticStartRequest;
import com.issuepilot.dto.diagnostic.DiagnosticStepRequest;
import com.issuepilot.security.UserIdentityResolver;
import com.issuepilot.service.diagnostic.AdaptiveDiagnosticService;
import com.issuepilot.service.diagnostic.QuizCorpusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Controller exposing the RAG-grounded adaptive diagnostic calibration endpoints.
 */
@RestController
@RequestMapping("/api/onboarding/diagnostic")
public class AdaptiveDiagnosticController {

    private final AdaptiveDiagnosticService diagnosticService;
    private final QuizCorpusService corpusService;
    private final UserIdentityResolver userIdentityResolver;

    @Autowired
    public AdaptiveDiagnosticController(
            AdaptiveDiagnosticService diagnosticService,
            QuizCorpusService corpusService,
            UserIdentityResolver userIdentityResolver
    ) {
        this.diagnosticService = diagnosticService;
        this.corpusService = corpusService;
        this.userIdentityResolver = userIdentityResolver;
    }

    private String requireAuthenticatedUserId(Authentication authentication) {
        String canonicalUserId = userIdentityResolver.resolveUserId(authentication);
        if (canonicalUserId == null || canonicalUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Active security principal is required.");
        }
        return canonicalUserId;
    }

    /**
     * Starts a new adaptive diagnostic session.
     */
    @PostMapping("/start")
    public ResponseEntity<DiagnosticQuestionDto> startDiagnostic(
            @RequestBody(required = false) DiagnosticStartRequest request,
            Authentication authentication
    ) {
        String canonicalUserId = requireAuthenticatedUserId(authentication);
        DiagnosticQuestionDto question = diagnosticService.startSession(canonicalUserId, request);
        return ResponseEntity.ok(question);
    }

    /**
     * Submits an answer for the current question and returns the next adaptive question or final evaluation.
     */
    @PostMapping("/step")
    public ResponseEntity<?> processStep(
            @RequestBody DiagnosticStepRequest request,
            Authentication authentication
    ) {
        String canonicalUserId = requireAuthenticatedUserId(authentication);
        Object response = diagnosticService.processStep(canonicalUserId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Lists all supported domains in the calibrated corpus.
     */
    @GetMapping("/domains")
    public ResponseEntity<Map<String, Object>> getSupportedDomains() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "total_domains", corpusService.getLoadedDomainCount(),
                "domains", List.of("Python", "TypeScript", "JavaScript", "React", "Go", "Java", "C++", "Docker", "OSS_Workflow")
        ));
    }
}
