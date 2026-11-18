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
        if (available.isEmpty()) {
            // Absolute fallback
            return createDefaultFallbackScenario(technology, tier);
        }

        List<CorpusScenario> unused = new ArrayList<>();
        for (CorpusScenario s : available) {
            if (usedIds == null || !usedIds.contains(s.scenarioId())) {
                unused.add(s);
            }
        }

        if (unused.isEmpty()) {
            unused = available; // All exhausted, rotate
        }

        // Deterministic pseudo-random pick or rotation
        return unused.get(new Random().nextInt(unused.size()));
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
