package com.issuepilot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches and caches real repository-level health and maintainer responsiveness
 * signals across GitHub, GitLab, and Codeberg so that the C++ ranking engine
 * receives authentic, differentiating R and H scores rather than static defaults.
 */
@Service
public class RepositoryTelemetryService {

    private static final Logger logger = LoggerFactory.getLogger(RepositoryTelemetryService.class);
    private static final long CACHE_TTL_MS = 6L * 60L * 60L * 1000L; // 6 hours
    private static final int MAX_CACHE_SIZE = 2000;

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Map<String, CacheEntry> repoCache = new ConcurrentHashMap<>();

    private record CacheEntry(long fetchedAtMs, RepoTelemetry telemetry) {}

    public record RepoTelemetry(
            String source,
            String repositoryFullName,
            boolean archived,
            int humanCommits90d,
            int distinctAuthors90d,
            int mergedPrs30d,
            double c90Score,
            double pr30Score,
            double au90Score,
            double ma90Score,
            double responseTimeScore,
            double responseRateScore,
            double prReviewScore,
            double recentMaintainerAct,
            double confidence,
            String observedAt
    ) {}

    @Autowired
    public RepositoryTelemetryService(AppProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build());
    }

    public RepositoryTelemetryService(AppProperties properties, ObjectMapper objectMapper, HttpClient httpClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    /**
     * Enriches a normalized issue document in-place with cached live repository
     * responsiveness and health telemetry.
     *
     * @return true if live telemetry was applied, false otherwise (e.g., Bugzilla or API unavailable)
     */
    public boolean enrichNormalizedIssue(Map<String, Object> normalized) {
        if (normalized == null) {
            return false;
        }
        String source = String.valueOf(normalized.getOrDefault("source", "")).trim().toLowerCase(Locale.ROOT);
        String repoFullName = String.valueOf(normalized.getOrDefault("repository_full_name", "")).trim();
        if (repoFullName.isBlank() || "bugzilla".equals(source)) {
            return false;
        }

        RepoTelemetry telemetry = getOrFetchTelemetry(source, repoFullName);
        if (telemetry == null) {
            return false;
        }

        Map<String, Object> respEvidence = new LinkedHashMap<>();
        respEvidence.put("available", !telemetry.archived());
        respEvidence.put("response_time_score", round1(telemetry.responseTimeScore()));
        respEvidence.put("response_rate_score", round1(telemetry.responseRateScore()));
        respEvidence.put("pr_review_score", round1(telemetry.prReviewScore()));
        respEvidence.put("recent_maintainer_act", round1(telemetry.recentMaintainerAct()));
        respEvidence.put("telemetry_source", "live_repo_api");
        respEvidence.put("observed_at", telemetry.observedAt());

        Map<String, Object> healthEvidence = new LinkedHashMap<>();
        healthEvidence.put("available", !telemetry.archived());
        healthEvidence.put("c90_score", round1(telemetry.c90Score()));
        healthEvidence.put("pr30_score", round1(telemetry.pr30Score()));
        healthEvidence.put("au90_score", round1(telemetry.au90Score()));
        healthEvidence.put("ma90_score", round1(telemetry.ma90Score()));
        healthEvidence.put("recent_commits", round1(telemetry.c90Score()));
        healthEvidence.put("pr_activity", round1(telemetry.pr30Score()));
        healthEvidence.put("issue_activity", round1(telemetry.responseRateScore()));
        healthEvidence.put("active_contributors", round1(telemetry.au90Score()));
        healthEvidence.put("recent_releases", round1(telemetry.ma90Score()));
        healthEvidence.put("telemetry_source", "live_repo_api");

        Map<String, Object> healthEvidenceV2 = new LinkedHashMap<>();
        healthEvidenceV2.put("available", !telemetry.archived());
        healthEvidenceV2.put("confidence", round2(telemetry.confidence()));
        healthEvidenceV2.put("c90_score", round1(telemetry.c90Score()));
        healthEvidenceV2.put("pr30_score", round1(telemetry.pr30Score()));
        healthEvidenceV2.put("au90_score", round1(telemetry.au90Score()));
        healthEvidenceV2.put("ma90_score", round1(telemetry.ma90Score()));
        healthEvidenceV2.put("human_commits_90d", telemetry.humanCommits90d());
        healthEvidenceV2.put("merged_prs_30d", telemetry.mergedPrs30d());
        healthEvidenceV2.put("distinct_authors_90d", telemetry.distinctAuthors90d());
        healthEvidenceV2.put("telemetry_source", "live_repo_api");
        healthEvidenceV2.put("observed_at", telemetry.observedAt());

        normalized.put("responsiveness_evidence", respEvidence);
        normalized.put("health_evidence", healthEvidence);
        normalized.put("health_evidence_v2", healthEvidenceV2);
        normalized.put("repo_archived", telemetry.archived());
        normalized.put("telemetry_enriched", true);
        return true;
    }

    public RepoTelemetry getOrFetchTelemetry(String source, String repoFullName) {
        if (source == null || source.isBlank() || repoFullName == null || repoFullName.isBlank()) {
            return null;
        }
        String key = source.toLowerCase(Locale.ROOT) + ":" + repoFullName.toLowerCase(Locale.ROOT);
        long now = System.currentTimeMillis();

        CacheEntry cached = repoCache.get(key);
        if (cached != null && (now - cached.fetchedAtMs()) < CACHE_TTL_MS) {
            return cached.telemetry();
        }

        RepoTelemetry fetched;
        try {
            fetched = switch (source.toLowerCase(Locale.ROOT)) {
                case "github" -> fetchGitHubTelemetry(repoFullName);
                case "gitlab" -> fetchGitLabTelemetry(repoFullName);
                case "codeberg" -> fetchCodebergTelemetry(repoFullName);
                default -> null;
            };
        } catch (Exception e) {
            logger.debug("Telemetry fetch skipped for {} ({}): {}", repoFullName, source, e.getMessage());
            fetched = null;
        }

        if (fetched != null) {
            evictIfNeeded(now);
            repoCache.put(key, new CacheEntry(now, fetched));
        }
        return fetched;
    }

    private void evictIfNeeded(long nowMs) {
        if (repoCache.size() >= MAX_CACHE_SIZE) {
            repoCache.entrySet().removeIf(e -> (nowMs - e.getValue().fetchedAtMs()) >= CACHE_TTL_MS);
            if (repoCache.size() >= MAX_CACHE_SIZE) {
                int toRemove = MAX_CACHE_SIZE / 4;
                Iterator<String> it = repoCache.keySet().iterator();
                while (it.hasNext() && toRemove-- > 0) {
                    it.next();
                    it.remove();
                }
            }
        }
    }

    private RepoTelemetry fetchGitHubTelemetry(String repoFullName) throws Exception {
        String baseUrl = properties.getGithubApiBaseUrl().replaceAll("/+$", "");
        String token = properties.getGithubToken();
        Map<String, Object> repoMeta = sendJsonMap(baseUrl + "/repos/" + repoFullName, token, "Bearer", "application/vnd.github.v3+json");
        if (repoMeta == null) {
            return null;
        }

        boolean archived = Boolean.TRUE.equals(repoMeta.get("archived")) || Boolean.TRUE.equals(repoMeta.get("disabled"));
        Instant pushedAt = parseInstant(str(repoMeta.get("pushed_at")));
        double ma90 = recencyActivityScore(pushedAt);

        Instant since90 = Instant.now().minus(Duration.ofDays(90));
        Instant since30 = Instant.now().minus(Duration.ofDays(30));
        String since90Iso = DateTimeFormatter.ISO_INSTANT.format(since90);

        // 1. Commits in last 90d
        List<Map<String, Object>> commits = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/commits?since=" + URLEncoder.encode(since90Iso, StandardCharsets.UTF_8) + "&per_page=30",
                token, "Bearer", "application/vnd.github.v3+json"
        );
        int humanCommits90 = 0;
        Set<String> authors90 = new HashSet<>();
        if (commits != null) {
            for (Map<String, Object> c : commits) {
                String authorKey = extractGitHubCommitAuthor(c);
                if (authorKey != null && !authorKey.endsWith("[bot]")) {
                    humanCommits90++;
                    authors90.add(authorKey);
                }
            }
        }

        // 2. Closed/merged PRs
        List<Map<String, Object>> pulls = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/pulls?state=closed&sort=updated&direction=desc&per_page=15",
                token, "Bearer", "application/vnd.github.v3+json"
        );
        int mergedPrs30 = 0;
        List<Double> prTurnaroundHours = new ArrayList<>();
        if (pulls != null) {
            for (Map<String, Object> pr : pulls) {
                Instant mergedAt = parseInstant(str(pr.get("merged_at")));
                Instant createdAt = parseInstant(str(pr.get("created_at")));
                if (mergedAt != null) {
                    if (!mergedAt.isBefore(since30)) {
                        mergedPrs30++;
                    }
                    if (createdAt != null && !mergedAt.isBefore(createdAt)) {
                        prTurnaroundHours.add(Duration.between(createdAt, mergedAt).toMinutes() / 60.0);
                    }
                }
            }
        }

        // 3. Recent issues for response rate
        List<Map<String, Object>> issues = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/issues?state=all&sort=updated&direction=desc&per_page=15",
                token, "Bearer", "application/vnd.github.v3+json"
        );
        int issueSamples = 0;
        int issuesWithReplies = 0;
        if (issues != null) {
            for (Map<String, Object> iss : issues) {
                if (iss.containsKey("pull_request")) {
                    continue;
                }
                issueSamples++;
                Object cm = iss.get("comments");
                if (cm instanceof Number n && n.intValue() > 0) {
                    issuesWithReplies++;
                }
            }
        }

        return buildTelemetry(
                "github", repoFullName, archived,
                humanCommits90, authors90.size(), mergedPrs30,
                ma90, prTurnaroundHours, issueSamples, issuesWithReplies,
                commits != null, pulls != null, issues != null
        );
    }

    private RepoTelemetry fetchGitLabTelemetry(String repoFullName) throws Exception {
        String baseUrl = properties.getGitlabApiBaseUrl().replaceAll("/+$", "");
        String token = properties.getGitlabToken();
        String encodedPath = URLEncoder.encode(repoFullName, StandardCharsets.UTF_8);

        Map<String, Object> proj = sendJsonMap(baseUrl + "/projects/" + encodedPath, token, "Bearer", "application/json");
        if (proj == null) {
            return null;
        }
        boolean archived = Boolean.TRUE.equals(proj.get("archived"));
        Instant pushedAt = parseInstant(str(proj.get("last_activity_at")));
        double ma90 = recencyActivityScore(pushedAt);

        Instant since90 = Instant.now().minus(Duration.ofDays(90));
        Instant since30 = Instant.now().minus(Duration.ofDays(30));
        String since90Iso = DateTimeFormatter.ISO_INSTANT.format(since90);

        List<Map<String, Object>> commits = sendJsonList(
                baseUrl + "/projects/" + encodedPath + "/repository/commits?since=" + URLEncoder.encode(since90Iso, StandardCharsets.UTF_8) + "&per_page=30",
                token, "Bearer", "application/json"
        );
        int humanCommits90 = 0;
        Set<String> authors90 = new HashSet<>();
        if (commits != null) {
            for (Map<String, Object> c : commits) {
                String author = str(c.get("author_name"));
                if (!author.isBlank() && !author.toLowerCase(Locale.ROOT).contains("bot")) {
                    humanCommits90++;
                    authors90.add(author.toLowerCase(Locale.ROOT));
                }
            }
        }

        List<Map<String, Object>> mrs = sendJsonList(
                baseUrl + "/projects/" + encodedPath + "/merge_requests?state=merged&order_by=updated_at&sort=desc&per_page=15",
                token, "Bearer", "application/json"
        );
        int mergedPrs30 = 0;
        List<Double> prHours = new ArrayList<>();
        if (mrs != null) {
            for (Map<String, Object> mr : mrs) {
                Instant mergedAt = parseInstant(str(mr.get("merged_at")));
                Instant createdAt = parseInstant(str(mr.get("created_at")));
                if (mergedAt != null) {
                    if (!mergedAt.isBefore(since30)) {
                        mergedPrs30++;
                    }
                    if (createdAt != null && !mergedAt.isBefore(createdAt)) {
                        prHours.add(Duration.between(createdAt, mergedAt).toMinutes() / 60.0);
                    }
                }
            }
        }

        List<Map<String, Object>> issues = sendJsonList(
                baseUrl + "/projects/" + encodedPath + "/issues?state=all&order_by=updated_at&sort=desc&per_page=15",
                token, "Bearer", "application/json"
        );
        int issueSamples = 0;
        int issuesWithReplies = 0;
        if (issues != null) {
            for (Map<String, Object> iss : issues) {
                issueSamples++;
                Object notes = iss.get("user_notes_count");
                if (notes instanceof Number n && n.intValue() > 0) {
                    issuesWithReplies++;
                }
            }
        }

        return buildTelemetry(
                "gitlab", repoFullName, archived,
                humanCommits90, authors90.size(), mergedPrs30,
                ma90, prHours, issueSamples, issuesWithReplies,
                commits != null, mrs != null, issues != null
        );
    }

    private RepoTelemetry fetchCodebergTelemetry(String repoFullName) throws Exception {
        String baseUrl = properties.getCodebergApiBaseUrl().replaceAll("/+$", "");
        String token = properties.getCodebergToken();
        Map<String, Object> repoMeta = sendJsonMap(baseUrl + "/repos/" + repoFullName, token, "token", "application/json");
        if (repoMeta == null) {
            return null;
        }
        boolean archived = Boolean.TRUE.equals(repoMeta.get("archived"));
        Instant pushedAt = parseInstant(str(repoMeta.get("updated_at")));
        double ma90 = recencyActivityScore(pushedAt);

        Instant since90 = Instant.now().minus(Duration.ofDays(90));
        Instant since30 = Instant.now().minus(Duration.ofDays(30));

        List<Map<String, Object>> commits = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/commits?limit=30",
                token, "token", "application/json"
        );
        int humanCommits90 = 0;
        Set<String> authors90 = new HashSet<>();
        if (commits != null) {
            for (Map<String, Object> c : commits) {
                Instant commitDate = parseInstant(extractCodebergCommitDate(c));
                if (commitDate != null && commitDate.isBefore(since90)) {
                    continue;
                }
                String authorKey = extractGitHubCommitAuthor(c);
                if (authorKey != null && !authorKey.contains("bot")) {
                    humanCommits90++;
                    authors90.add(authorKey);
                }
            }
        }

        List<Map<String, Object>> pulls = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/pulls?state=closed&limit=15",
                token, "token", "application/json"
        );
        int mergedPrs30 = 0;
        List<Double> prHours = new ArrayList<>();
        if (pulls != null) {
            for (Map<String, Object> pr : pulls) {
                Instant mergedAt = parseInstant(str(pr.get("merged_at")));
                Instant createdAt = parseInstant(str(pr.get("created_at")));
                if (mergedAt != null) {
                    if (!mergedAt.isBefore(since30)) {
                        mergedPrs30++;
                    }
                    if (createdAt != null && !mergedAt.isBefore(createdAt)) {
                        prHours.add(Duration.between(createdAt, mergedAt).toMinutes() / 60.0);
                    }
                }
            }
        }

        List<Map<String, Object>> issues = sendJsonList(
                baseUrl + "/repos/" + repoFullName + "/issues?state=all&limit=15",
                token, "token", "application/json"
        );
        int issueSamples = 0;
        int issuesWithReplies = 0;
        if (issues != null) {
            for (Map<String, Object> iss : issues) {
                if (iss.containsKey("pull_request") && iss.get("pull_request") != null) {
                    continue;
                }
                issueSamples++;
                Object cm = iss.get("comments");
                if (cm instanceof Number n && n.intValue() > 0) {
                    issuesWithReplies++;
                }
            }
        }

        return buildTelemetry(
                "codeberg", repoFullName, archived,
                humanCommits90, authors90.size(), mergedPrs30,
                ma90, prHours, issueSamples, issuesWithReplies,
                commits != null, pulls != null, issues != null
        );
    }

    private RepoTelemetry buildTelemetry(
            String source,
            String repoFullName,
            boolean archived,
            int humanCommits90,
            int distinctAuthors90,
            int mergedPrs30,
            double ma90Score,
            List<Double> prTurnaroundHours,
            int issueSamples,
            int issuesWithReplies,
            boolean hasCommitsData,
            boolean hasPullsData,
            boolean hasIssuesData
    ) {
        if (archived) {
            return new RepoTelemetry(
                    source, repoFullName, true, 0, 0, 0,
                    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
                    DateTimeFormatter.ISO_INSTANT.format(Instant.now())
            );
        }

        double c90 = hasCommitsData ? saturate(humanCommits90, 15.0) : Math.max(20.0, ma90Score * 0.7);
        double au90 = hasCommitsData ? saturate(distinctAuthors90, 4.0) : Math.max(20.0, ma90Score * 0.6);
        double pr30 = hasPullsData ? saturate(mergedPrs30, 4.0) : Math.max(25.0, ma90Score * 0.65);

        double prReviewScore;
        if (!prTurnaroundHours.isEmpty()) {
            prReviewScore = turnaroundToScore(median(prTurnaroundHours));
        } else if (hasPullsData) {
            prReviewScore = 40.0; // No recent merged PRs observed
        } else {
            prReviewScore = Math.max(35.0, ma90Score * 0.7);
        }

        double responseRateScore = (issueSamples > 0)
                ? (100.0 * issuesWithReplies / issueSamples)
                : (hasIssuesData ? 50.0 : Math.max(40.0, ma90Score * 0.75));

        double responseTimeScore = 0.55 * prReviewScore + 0.45 * ma90Score;
        int signalsObserved = (hasCommitsData ? 1 : 0) + (hasPullsData ? 1 : 0) + (hasIssuesData ? 1 : 0);
        double confidence = 0.40 + (0.20 * signalsObserved);

        return new RepoTelemetry(
                source,
                repoFullName,
                false,
                humanCommits90,
                distinctAuthors90,
                mergedPrs30,
                c90,
                pr30,
                au90,
                ma90Score,
                responseTimeScore,
                responseRateScore,
                prReviewScore,
                ma90Score,
                confidence,
                DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        );
    }

    private static double saturate(int count, double scale) {
        if (count <= 0) {
            return 0.0;
        }
        return Math.min(100.0, 100.0 * (1.0 - Math.exp(-count / scale)));
    }

    private static double turnaroundToScore(double medianHours) {
        if (medianHours <= 4.0) return 98.0;
        if (medianHours <= 24.0) return 86.0;
        if (medianHours <= 72.0) return 68.0;
        if (medianHours <= 168.0) return 45.0;
        return 20.0;
    }

    private static double recencyActivityScore(Instant pushedAt) {
        if (pushedAt == null) return 45.0;
        long days = Math.max(0, Duration.between(pushedAt, Instant.now()).toDays());
        if (days <= 2) return 100.0;
        if (days <= 7) return 92.0;
        if (days <= 14) return 84.0;
        if (days <= 30) return 72.0;
        if (days <= 60) return 52.0;
        if (days <= 90) return 32.0;
        return 12.0;
    }

    private static double median(List<Double> values) {
        List<Double> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(mid);
        }
        return (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }

    private Map<String, Object> sendJsonMap(String url, String token, String authScheme, String accept) throws Exception {
        HttpResponse<String> resp = executeGet(url, token, authScheme, accept);
        if (resp == null || resp.statusCode() != 200) {
            return null;
        }
        return objectMapper.readValue(resp.body(), new TypeReference<>() {});
    }

    private List<Map<String, Object>> sendJsonList(String url, String token, String authScheme, String accept) throws Exception {
        HttpResponse<String> resp = executeGet(url, token, authScheme, accept);
        if (resp == null || resp.statusCode() != 200) {
            return null;
        }
        return objectMapper.readValue(resp.body(), new TypeReference<>() {});
    }

    private HttpResponse<String> executeGet(String url, String token, String authScheme, String accept) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", accept)
                .header("User-Agent", "IssuePilot/1.1")
                .timeout(Duration.ofSeconds(8))
                .GET();
        if (token != null && !token.isBlank()) {
            builder.header("Authorization", authScheme + " " + token.trim());
        }
        HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (resp.statusCode() == 401 && token != null && !token.isBlank()) {
            HttpRequest retry = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", accept)
                    .header("User-Agent", "IssuePilot/1.1")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            resp = httpClient.send(retry, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        }
        return resp;
    }

    @SuppressWarnings("unchecked")
    private static String extractGitHubCommitAuthor(Map<String, Object> commitItem) {
        Object authorObj = commitItem.get("author");
        if (authorObj instanceof Map<?, ?> am && am.get("login") != null) {
            return am.get("login").toString().toLowerCase(Locale.ROOT);
        }
        Object commitObj = commitItem.get("commit");
        if (commitObj instanceof Map<?, ?> cm && cm.get("author") instanceof Map<?, ?> inner && inner.get("email") != null) {
            return inner.get("email").toString().toLowerCase(Locale.ROOT);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static String extractCodebergCommitDate(Map<String, Object> commitItem) {
        Object commitObj = commitItem.get("commit");
        if (commitObj instanceof Map<?, ?> cm && cm.get("committer") instanceof Map<?, ?> inner && inner.get("date") != null) {
            return inner.get("date").toString();
        }
        return str(commitItem.get("created"));
    }

    private static Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OffsetDateTime.parse(raw.trim()).toInstant();
        } catch (Exception ignored) {}
        try {
            return Instant.parse(raw.trim());
        } catch (Exception ignored) {}
        return null;
    }

    private static String str(Object o) {
        return o != null ? o.toString() : "";
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
