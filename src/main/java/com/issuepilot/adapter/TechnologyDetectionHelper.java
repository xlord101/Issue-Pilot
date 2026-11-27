package com.issuepilot.adapter;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

public final class TechnologyDetectionHelper {

    private static final Map<String, List<String>> TECH_PATTERNS = new LinkedHashMap<>();

    static {
        TECH_PATTERNS.put("python", Arrays.asList("python", "\\bpy\\b", "\\bpytest\\b", "\\bpypi\\b", "\\bpip\\b", "asyncio", "pydantic"));
        TECH_PATTERNS.put("fastapi", Arrays.asList("fastapi", "uvicorn", "starlette"));
        TECH_PATTERNS.put("flask", Arrays.asList("flask", "werkzeug", "jinja", "jinja2"));
        TECH_PATTERNS.put("django", Arrays.asList("django", "django-rest", "drf"));
        TECH_PATTERNS.put("react", Arrays.asList("react", "\\bjsx\\b", "\\btsx\\b", "redux", "nextjs", "next.js", "vite"));
        TECH_PATTERNS.put("typescript", Arrays.asList("typescript", "\\bts\\b", "\\btsc\\b", "\\btyping\\b"));
        TECH_PATTERNS.put("javascript", Arrays.asList("javascript", "\\bjs\\b", "\\bnode\\b", "nodejs", "node.js", "\\bnpm\\b", "ecmascript"));
        TECH_PATTERNS.put("c++", Arrays.asList("c++", "\\bcpp\\b", "\\bcxx\\b", "clang", "\\bgcc\\b", "\\bstl\\b", "boost"));
        TECH_PATTERNS.put("c", Arrays.asList("\\bc\\b", "glibc", "posix"));
        TECH_PATTERNS.put("rust", Arrays.asList("rust", "cargo", "crates", "rustc"));
        TECH_PATTERNS.put("go", Arrays.asList("golang", "goroutine", "\\bgo\\.mod\\b", "\\bgo\\.sum\\b"));
        TECH_PATTERNS.put("java", Arrays.asList("\\bjava\\b", "\\bjvm\\b", "\\bjdk\\b", "gradle", "maven"));
        TECH_PATTERNS.put("spring", Arrays.asList("spring-boot", "springboot", "spring-data", "\\bspring\\b"));
        TECH_PATTERNS.put("mongodb", Arrays.asList("mongodb", "pymongo", "mongoclient", "\\bmongo\\b"));
        TECH_PATTERNS.put("postgresql", Arrays.asList("postgres", "postgresql", "psycopg"));
        TECH_PATTERNS.put("docker", Arrays.asList("docker", "dockerfile", "containerd"));
        TECH_PATTERNS.put("kubernetes", Arrays.asList("kubernetes", "\\bk8s\\b", "\\bhelm\\b", "kubectl"));
        TECH_PATTERNS.put("cmake", Arrays.asList("cmakelists", "\\bcmake\\b"));
        TECH_PATTERNS.put("linux", Arrays.asList("\\blinux\\b", "ubuntu", "debian", "fedora", "arch"));
        TECH_PATTERNS.put("documentation", Arrays.asList("documentation", "docstring", "tutorial", "readme"));
    }

    private TechnologyDetectionHelper() {}

    public static List<Map<String, Object>> detectTechnologies(String text, List<String> labels) {
        String combined = (text != null ? text.toLowerCase() : "") + " " + (labels != null ? String.join(" ", labels).toLowerCase() : "");
        Map<String, Double> detected = new LinkedHashMap<>();

        for (Map.Entry<String, List<String>> entry : TECH_PATTERNS.entrySet()) {
            String tech = entry.getKey();
            for (String kw : entry.getValue()) {
                if (kw.startsWith("\\b") || kw.endsWith("\\b") || kw.contains("\\.")) {
                    if (Pattern.compile(kw, Pattern.CASE_INSENSITIVE).matcher(combined).find()) {
                        detected.put(capitalize(tech), detected.getOrDefault(capitalize(tech), 0.0) + 2.0);
                        break;
                    }
                } else if (Pattern.compile("\\b" + Pattern.quote(kw) + "\\b", Pattern.CASE_INSENSITIVE).matcher(combined).find()) {
                    detected.put(capitalize(tech), detected.getOrDefault(capitalize(tech), 0.0) + 2.0);
                    break;
                }
            }
        }

        if (detected.isEmpty()) {
            detected.put("General", 1.0);
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (Map.Entry<String, Double> e : detected.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("technology", e.getKey());
            item.put("raw_relevance", Math.min(5.0, e.getValue()));
            list.add(item);
        }
        return list;
    }

    private static final List<String> BEGINNER_KEYWORDS = Arrays.asList(
            "typo", "broken link", "readme", "docstring", "formatting", "lint", "prettier", "eslint",
            "warning", "add test", "unit test", "test coverage", "badge", "css", "padding", "alignment",
            "rename", "spelling", "grammar", "example", "tutorial"
    );

    private static final List<String> COMPLEX_KEYWORDS = Arrays.asList(
            "race condition", "deadlock", "mutex", "thread-safe", "concurrency", "memory leak",
            "use-after-free", "segfault", "distributed", "consensus", "transaction", "migration",
            "database schema", "breaking change", "backwards compatibility", "ast", "parser",
            "bytecode", "compiler", "kernel", "allocator", "zero-copy", "profiling", "optimization",
            "encryption", "cryptography", "vulnerability", "cve", "regression", "state machine",
            "websocket", "streaming", "replication", "sharding", "async", "dead-lock", "lock-free"
    );

    public static Map<String, Object> estimateDifficulty(String title, String body, List<String> labels, int comments) {
        List<String> labelList = labels != null ? labels : Collections.emptyList();
        String safeTitle = title != null ? title.toLowerCase(Locale.ROOT) : "";
        String safeBody = body != null ? body.toLowerCase(Locale.ROOT) : "";
        String combined = safeTitle + " " + safeBody;

        double deltaLabel = 0.0;
        for (String rawLabel : labelList) {
            if (rawLabel == null) continue;
            String s = rawLabel.toLowerCase(Locale.ROOT);
            if (s.contains("good first") || s.contains("good-first") || s.contains("beginner")
                    || s.contains("easy") || s.contains("starter") || s.contains("first-timers")
                    || s.contains("trivial") || s.contains("quick-win") || s.contains("low-hanging")) {
                deltaLabel -= 18.0;
            } else if (s.contains("documentation") || s.contains("docs") || s.contains("typo")) {
                deltaLabel -= 12.0;
            } else if (s.contains("help wanted")) {
                deltaLabel -= 4.0;
            } else if (s.contains("hard") || s.contains("epic") || s.contains("breaking")
                    || s.contains("architecture") || s.contains("refactor") || s.contains("security")
                    || s.contains("cve") || s.contains("performance") || s.contains("concurrency")
                    || s.contains("kernel") || s.contains("compiler") || s.contains("critical")) {
                deltaLabel += 22.0;
            } else if (s.contains("enhancement") || s.contains("feature") || s.contains("rfc")) {
                deltaLabel += 7.0;
            }
        }
        deltaLabel = Math.max(-24.0, Math.min(30.0, deltaLabel));

        int beginnerHits = 0;
        for (String kw : BEGINNER_KEYWORDS) {
            if (combined.contains(kw)) {
                beginnerHits++;
            }
        }

        int complexHits = 0;
        for (String kw : COMPLEX_KEYWORDS) {
            if (combined.contains(kw)) {
                complexHits++;
            }
        }

        double textShift = Math.min(28.0, complexHits * 8.0) - Math.min(18.0, beginnerHits * 6.0);

        int bodyLen = safeBody.length();
        double depthShift = 0.0;
        if (bodyLen > 0 && bodyLen < 220) {
            depthShift -= 6.0;
        } else if (bodyLen > 2000) {
            depthShift += 11.0;
        } else if (bodyLen > 850) {
            depthShift += 5.0;
        }

        boolean hasCodeOrTrace = safeBody.contains("```") || safeBody.contains("traceback")
                || safeBody.contains("exception") || safeBody.contains("stack trace");
        if (hasCodeOrTrace && complexHits > 0) {
            depthShift += 5.0;
        }

        int checklistCount = 0;
        int idx = 0;
        while ((idx = safeBody.indexOf("- [ ]", idx)) != -1) {
            checklistCount++;
            idx += 5;
        }
        double checklistShift = checklistCount >= 3 ? Math.min(14.0, checklistCount * 2.5) : 0.0;

        double commentEffortShift = 0.0;
        double commentCoordShift = 0.0;
        if (comments > 20) {
            commentEffortShift = 16.0;
            commentCoordShift = 18.0;
        } else if (comments > 10) {
            commentEffortShift = 10.0;
            commentCoordShift = 12.0;
        } else if (comments > 4) {
            commentEffortShift = 5.0;
            commentCoordShift = 6.0;
        }

        double scope = clampScore(50.0 + deltaLabel + depthShift + checklistShift - Math.min(14.0, beginnerHits * 5.0));
        double complexity = clampScore(50.0 + deltaLabel + textShift + (hasCodeOrTrace ? 4.0 : 0.0));
        double effort = clampScore(48.0 + deltaLabel + textShift * 0.6 + checklistShift + commentEffortShift);
        double arch = clampScore(46.0 + deltaLabel * 0.9 + Math.min(28.0, complexHits * 9.0) - Math.min(14.0, beginnerHits * 5.0));
        double coord = clampScore(42.0 + deltaLabel * 0.7 + checklistShift * 0.7 + commentCoordShift);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scope_change_size", scope);
        m.put("technical_complexity", complexity);
        m.put("historical_effort", effort);
        m.put("dependency_arch_impact", arch);
        m.put("coordination_complexity", coord);
        return m;
    }

    private static double clampScore(double val) {
        return Math.round(Math.max(15.0, Math.min(95.0, val)) * 10.0) / 10.0;
    }

    public static Map<String, Object> computeFreshness(String createdAt, String updatedAt) {
        double ageScore = 70.0;
        double actScore = 70.0;

        try {
            Instant now = Instant.now();
            if (createdAt != null && !createdAt.isBlank()) {
                Instant c = Instant.parse(createdAt);
                long days = Duration.between(c, now).toDays();
                ageScore = Math.max(10.0, 100.0 - (days * 1.5));
            }
            if (updatedAt != null && !updatedAt.isBlank()) {
                Instant u = Instant.parse(updatedAt);
                long days = Duration.between(u, now).toDays();
                actScore = Math.max(10.0, 100.0 - (days * 2.5));
            }
        } catch (Exception ignored) {
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("available", true);
        m.put("age_score", Math.min(100.0, Math.max(0.0, ageScore)));
        m.put("activity_score", Math.min(100.0, Math.max(0.0, actScore)));
        return m;
    }

    public static String normalizeTechnology(String input) {
        if (input == null || input.isBlank()) return null;
        String clean = input.trim().toLowerCase();
        return switch (clean) {
            case "py", "python", "python3" -> "Python";
            case "ts", "typescript" -> "TypeScript";
            case "js", "javascript", "node", "nodejs" -> "JavaScript";
            case "react", "reactjs", "react.js" -> "React";
            case "cpp", "c++", "cxx" -> "C++";
            case "c" -> "C";
            case "go", "golang" -> "Go";
            case "rust", "rustlang" -> "Rust";
            case "java", "jvm", "jdk" -> "Java";
            case "spring", "springboot", "spring-boot" -> "Spring";
            case "fastapi" -> "FastAPI";
            case "flask" -> "Flask";
            case "django" -> "Django";
            case "mongodb", "mongo" -> "MongoDB";
            case "postgres", "postgresql" -> "PostgreSQL";
            case "docker" -> "Docker";
            case "kubernetes", "k8s" -> "Kubernetes";
            case "cmake" -> "CMake";
            case "linux" -> "Linux";
            case "docs", "documentation" -> "Documentation";
            default -> capitalize(clean);
        };
    }

    public static String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        if (str.equalsIgnoreCase("c++") || str.equalsIgnoreCase("cpp")) return "C++";
        if (str.equalsIgnoreCase("fastapi")) return "FastAPI";
        if (str.equalsIgnoreCase("mongodb")) return "MongoDB";
        if (str.equalsIgnoreCase("postgresql")) return "PostgreSQL";
        if (str.equalsIgnoreCase("javascript")) return "JavaScript";
        if (str.equalsIgnoreCase("typescript")) return "TypeScript";
        return Character.toUpperCase(str.charAt(0)) + str.substring(1);
    }
}
