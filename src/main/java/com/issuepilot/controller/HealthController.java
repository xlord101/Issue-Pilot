package com.issuepilot.controller;

import com.issuepilot.config.AppProperties;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.repository.IssueRepository;
import com.issuepilot.service.CppRankingClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final MongoConfig mongoConfig;
    private final AppProperties properties;
    private final CppRankingClient cppRankingClient;
    private final com.issuepilot.service.SchedulerService schedulerService;
    private final IssueRepository issueRepository;

    public HealthController(
            MongoConfig mongoConfig,
            AppProperties properties,
            CppRankingClient cppRankingClient,
            com.issuepilot.service.SchedulerService schedulerService
    ) {
        this(mongoConfig, properties, cppRankingClient, schedulerService, null);
    }

    @Autowired
    public HealthController(
            MongoConfig mongoConfig,
            AppProperties properties,
            CppRankingClient cppRankingClient,
            com.issuepilot.service.SchedulerService schedulerService,
            @Autowired(required = false) IssueRepository issueRepository
    ) {
        this.mongoConfig = mongoConfig;
        this.properties = properties;
        this.cppRankingClient = cppRankingClient;
        this.schedulerService = schedulerService;
        this.issueRepository = issueRepository;
    }

    public boolean isSchedulerActive() {
        return schedulerService != null && schedulerService.isRunning();
    }

    @GetMapping("/")
    public Map<String, Object> rootStatus() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("service", "issue-pilot-api");
        info.put("status", "ok");
        info.put("health", "/api/health");
        return info;
    }

    @GetMapping("/api/health")
    public Map<String, Object> healthCheck() {
        boolean atlasOk = mongoConfig.isConnected();
        boolean cppOk = false;
        String cppVer = "unknown";
        try {
            cppOk = cppRankingClient.isAvailable();
            if (cppOk) {
                cppVer = cppRankingClient.getVersion();
            }
        } catch (Exception ignored) {
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", (atlasOk && cppOk) ? "healthy" : "degraded");
        response.put("mongodb_atlas_connected", atlasOk);
        response.put("database_name", properties.getMongodbDatabase());
        response.put("cpp_ranking_engine_available", cppOk);
        response.put("algorithm_version", cppVer);
        response.put("github_token_configured", properties.getGithubToken() != null && !properties.getGithubToken().isBlank());
        response.put("ingestion_enabled", properties.isIngestionEnabled());
        response.put("scheduler_active", isSchedulerActive());
        if (issueRepository != null) {
            try {
                Map<String, Long> sourceCounts = new LinkedHashMap<>();
                sourceCounts.put("github", issueRepository.countBySource("github"));
                sourceCounts.put("gitlab", issueRepository.countBySource("gitlab"));
                sourceCounts.put("codeberg", issueRepository.countBySource("codeberg"));
                sourceCounts.put("bugzilla", issueRepository.countBySource("bugzilla"));
                response.put("source_counts", sourceCounts);
            } catch (Exception ignored) {}
        }
        if (schedulerService != null) {
            Map<String, Object> schedStatus = schedulerService.getStatus();
            if (schedStatus.get("last_run_at") != null) {
                response.put("scheduler_last_run_at", schedStatus.get("last_run_at"));
            }
            Object lastSummaryObj = schedStatus.get("last_run_summary");
            if (lastSummaryObj instanceof Map<?, ?> lastSummary && lastSummary.get("discovery") instanceof Map<?, ?> disc) {
                if (disc.get("per_source_summary") instanceof Map<?, ?> perSource) {
                    Map<String, Object> sourceHealth = new LinkedHashMap<>();
                    for (Map.Entry<?, ?> entry : perSource.entrySet()) {
                        if (entry.getKey() != null && entry.getValue() instanceof Map<?, ?> stats) {
                            Map<String, Object> compact = new LinkedHashMap<>();
                            compact.put("status", stats.get("status"));
                            compact.put("discovered", stats.get("discovered"));
                            compact.put("inserted", stats.get("inserted"));
                            if (stats.get("errors") != null) {
                                compact.put("errors", stats.get("errors"));
                            }
                            sourceHealth.put(String.valueOf(entry.getKey()), compact);
                        }
                    }
                    response.put("last_discovery_sources", sourceHealth);
                }
            }
        }

        return response;
    }
}
