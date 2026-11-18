package com.issuepilot.service.diagnostic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.adapter.TechnologyDetectionHelper;
import com.issuepilot.config.AppProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service that loads, manages, and retrieves grounded competencies from the
 * calibrated quiz corpus and optionally synthesizes contextual scenarios via LLM.
 */
@Service
public class QuizCorpusService {

    private static final Logger logger = LoggerFactory.getLogger(QuizCorpusService.class);

    private final ObjectMapper objectMapper;
    private final AppProperties properties;
    private final RestTemplate restTemplate;

    private final Map<String, Map<String, List<CorpusScenario>>> corpusByDomainAndTier = new ConcurrentHashMap<>();

    @Autowired
    public QuizCorpusService(ObjectMapper objectMapper, AppProperties properties) {
        this(objectMapper, properties, new RestTemplate());
    }

    public QuizCorpusService(ObjectMapper objectMapper, AppProperties properties, RestTemplate restTemplate) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public record ScenarioOption(
            String id,
            String text,
            double scoreWeight,
            boolean isOptimal,
            String rubricExplanation
    ) {}

    public record CorpusScenario(
            String scenarioId,
            String archetype,
            String scenario,
            List<ScenarioOption> options
    ) {}

    @PostConstruct
    public void init() {
        loadCorpus();
    }

    public synchronized void loadCorpus() {
        try {
            ClassPathResource resource = new ClassPathResource("fixtures/calibrated_quiz_corpus.json");
            if (!resource.exists()) {
                logger.warn("Calibrated quiz corpus fixture not found on classpath: fixtures/calibrated_quiz_corpus.json");
                return;
            }

            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                JsonNode domains = root.path("domains");
                Iterator<Map.Entry<String, JsonNode>> domainFields = domains.fields();

                corpusByDomainAndTier.clear();

                while (domainFields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = domainFields.next();
                    String domainName = entry.getKey();
                    String canonicalDomain = canonicalizeTechnology(domainName);
                    Map<String, List<CorpusScenario>> tiersMap = new HashMap<>();

                    JsonNode tiersNode = entry.getValue();
                    for (String tier : List.of("BEGINNER", "INTERMEDIATE", "ADVANCED")) {
                        JsonNode scenariosArray = tiersNode.path(tier);
                        List<CorpusScenario> scenarios = new ArrayList<>();
                        if (scenariosArray.isArray()) {
                            for (JsonNode sn : scenariosArray) {
                                String sId = sn.path("scenario_id").asText();
                                String archetype = sn.path("archetype").asText();
                                String scenarioText = sn.path("scenario").asText();
                                List<ScenarioOption> options = new ArrayList<>();
                                for (JsonNode opt : sn.path("options")) {
                                    options.add(new ScenarioOption(
                                            opt.path("id").asText(),
                                            opt.path("text").asText(),
                                            opt.path("score_weight").asDouble(50.0),
                                            opt.path("is_optimal").asBoolean(false),
                                            opt.path("rubric_explanation").asText()
                                    ));
                                }
                                scenarios.add(new CorpusScenario(sId, archetype, scenarioText, options));
                            }
                        }
                        tiersMap.put(tier, scenarios);
                    }
                    corpusByDomainAndTier.put(canonicalDomain, tiersMap);
                }
                logger.info("Successfully loaded calibrated quiz corpus with {} domains.", corpusByDomainAndTier.size());
            }
        } catch (Exception e) {
            logger.error("Failed to load calibrated quiz corpus: {}", e.getMessage(), e);
        }
    }

    public String canonicalizeTechnology(String rawTech) {
        if (rawTech == null || rawTech.isBlank()) {
            return "OSS_Workflow";
        }
        String norm = TechnologyDetectionHelper.normalizeTechnology(rawTech);
        if ("oss_workflow".equalsIgnoreCase(norm) || "git".equalsIgnoreCase(norm)) {
            return "OSS_Workflow";
        }
        for (String registered : corpusByDomainAndTier.keySet()) {
            if (registered.equalsIgnoreCase(norm) || registered.equalsIgnoreCase(rawTech.trim())) {
                return registered;
            }
        }
        return norm;
    }

    public List<CorpusScenario> getScenarios(String technology, String tier) {
        String canonicalTech = canonicalizeTechnology(technology);
        String upperTier = tier != null ? tier.toUpperCase(Locale.ROOT) : "INTERMEDIATE";

        Map<String, List<CorpusScenario>> tierMap = corpusByDomainAndTier.get(canonicalTech);
        if (tierMap == null || !tierMap.containsKey(upperTier) || tierMap.get(upperTier).isEmpty()) {
            // Fall back to OSS_Workflow or general domain
            tierMap = corpusByDomainAndTier.get("OSS_Workflow");
        }

        if (tierMap != null && tierMap.containsKey(upperTier)) {
            return tierMap.get(upperTier);
        }
        return Collections.emptyList();
    }

    public CorpusScenario selectScenario(String technology, String tier, Set<String> usedIds) {
        List<CorpusScenario> available = getScenarios(technology, tier);
        CorpusScenario baseScenario;
        if (available.isEmpty()) {
            baseScenario = createDefaultFallbackScenario(technology, tier);
        } else {
            List<CorpusScenario> unused = new ArrayList<>();
            for (CorpusScenario s : available) {
                if (usedIds == null || !usedIds.contains(s.scenarioId())) {
                    unused.add(s);
                }
            }
            if (unused.isEmpty()) {
                unused = available; // All exhausted, rotate
            }
            baseScenario = unused.get(new Random().nextInt(unused.size()));
        }

        // If Gemini API Key is provided, dynamically synthesize a fresh, contextualized variation
        String apiKey = properties.getGeminiApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                CorpusScenario synthesized = synthesizeWithGemini(technology, tier, baseScenario, apiKey);
                if (synthesized != null) {
                    return synthesized;
                }
            } catch (Exception e) {
                logger.warn("Gemini dynamic scenario synthesis fallback: {}", e.getMessage());
            }
        }

        return baseScenario;
    }

    private CorpusScenario synthesizeWithGemini(String technology, String tier, CorpusScenario base, String apiKey) {
        String model = properties.getGeminiModel();
        if (model == null || model.isBlank()) {
            model = "gemini-1.5-flash";
        }
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        String prompt = "You are the Issue Pilot Technical Assessment Engine. You are creating a 10-second practical multiple-choice scenario for an open-source contributor in " + technology + " at difficulty tier: " + tier + ".\n"
                + "Archetype focus: " + base.archetype() + "\n"
                + "Reference baseline: " + base.scenario() + "\n"
                + "Rules:\n"
                + "1. Zero trivia, zero history. Only hands-on debugging, architecture, concurrency, or Git/OSS PR practices.\n"
                + "2. Exactly 4 options (A, B, C, D) with exactly ONE optimal solution.\n"
                + "3. Output MUST be strictly valid JSON matching this schema:\n"
                + "{\n"
                + "  \"scenario\": \"<concise problem text>\",\n"
                + "  \"options\": [\n"
                + "    {\"id\": \"A\", \"text\": \"...\", \"is_optimal\": true, \"score_weight\": 80.0, \"rubric_explanation\": \"...\"},\n"
                + "    {\"id\": \"B\", \"text\": \"...\", \"is_optimal\": false, \"score_weight\": 30.0, \"rubric_explanation\": \"...\"},\n"
                + "    {\"id\": \"C\", \"text\": \"...\", \"is_optimal\": false, \"score_weight\": 20.0, \"rubric_explanation\": \"...\"},\n"
                + "    {\"id\": \"D\", \"text\": \"...\", \"is_optimal\": false, \"score_weight\": 15.0, \"rubric_explanation\": \"...\"}\n"
                + "  ]\n"
                + "}";

        Map<String, Object> reqBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.4,
                        "responseMimeType", "application/json"
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(reqBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (!textNode.isMissingNode()) {
                    String jsonText = textNode.asText();
                    JsonNode parsed = objectMapper.readTree(jsonText);
                    String scenarioText = parsed.path("scenario").asText();
                    List<ScenarioOption> options = new ArrayList<>();
                    for (JsonNode opt : parsed.path("options")) {
                        options.add(new ScenarioOption(
                                opt.path("id").asText(),
                                opt.path("text").asText(),
                                opt.path("score_weight").asDouble(50.0),
                                opt.path("is_optimal").asBoolean(false),
                                opt.path("rubric_explanation").asText()
                        ));
                    }
                    if (options.size() == 4) {
                        return new CorpusScenario("gemini-" + UUID.randomUUID().toString().substring(0, 8), base.archetype(), scenarioText, options);
                    }
                }
            } catch (Exception e) {
                logger.warn("Could not parse Gemini JSON response: {}", e.getMessage());
            }
        }
        return null;
    }

    private CorpusScenario createDefaultFallbackScenario(String technology, String tier) {
        return new CorpusScenario(
                "fallback-" + technology.toLowerCase() + "-" + tier.toLowerCase(),
                "general_contribution_hygiene",
                "You are preparing a pull request in " + technology + " addressing a reported bug. What is the most critical verification step before requesting maintainer review?",
                List.of(
                        new ScenarioOption("A", "Run the existing project test suite locally to ensure no regressions were introduced.", 75.0, true, "Standard regression prevention."),
                        new ScenarioOption("B", "Delete the test folder so tests do not fail on CI.", 10.0, false, "Antipattern violating repository integrity."),
                        new ScenarioOption("C", "Directly commit to the upstream main branch without creating a feature branch.", 20.0, false, "Lacks branch isolation."),
                        new ScenarioOption("D", "Merge your changes without checking linter or style guidelines.", 30.0, false, "Violates code standards.")
                )
        );
    }

    public int getLoadedDomainCount() {
        return corpusByDomainAndTier.size();
    }
}
