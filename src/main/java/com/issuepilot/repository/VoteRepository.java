package com.issuepilot.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.model.IssueVote;
import com.mongodb.client.model.IndexOptions;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class VoteRepository {

    private static final Logger logger = LoggerFactory.getLogger(VoteRepository.class);
    public static final String COLLECTION_NAME = "issue_votes";

    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;
    private final MongoConfig mongoConfig;
    private final Map<String, IssueVote> inMemoryVotes = new ConcurrentHashMap<>();

    public VoteRepository(MongoTemplate mongoTemplate, ObjectMapper objectMapper) {
        this(mongoTemplate, objectMapper, null);
    }

    @Autowired
    public VoteRepository(MongoTemplate mongoTemplate, ObjectMapper objectMapper, @Autowired(required = false) MongoConfig mongoConfig) {
        this.mongoTemplate = mongoTemplate;
        this.objectMapper = objectMapper;
        this.mongoConfig = mongoConfig;
    }

    private boolean isMongoActive() {
        if (mongoTemplate == null) {
            return false;
        }
        if (mongoConfig == null) {
            return true;
        }
        return mongoConfig.isConnected();
    }

    @PostConstruct
    public void ensureIndexes() {
        if (!isMongoActive()) {
            return;
        }
        try {
            var collection = mongoTemplate.getCollection(COLLECTION_NAME);
            // 1. Enforce unique compound index on (user_id, source, platform_issue_id)
            Document uniqueKey = new Document("user_id", 1)
                    .append("source", 1)
                    .append("platform_issue_id", 1);
            IndexOptions uniqueOpts = new IndexOptions()
                    .unique(true)
                    .name("uniq_user_source_platform_issue");
            collection.createIndex(uniqueKey, uniqueOpts);

            // 2. Fast query index for user votes ordered by updated_at
            Document userKey = new Document("user_id", 1).append("updated_at", -1);
            collection.createIndex(userKey, new IndexOptions().name("idx_user_updated"));
            logger.info("Verified indexes on collection '{}'", COLLECTION_NAME);
        } catch (Exception e) {
            logger.warn("Could not ensure indexes on '{}': {}", COLLECTION_NAME, e.getMessage());
        }
    }

    private Document cleanDoc(Document doc) {
        if (doc == null) return null;
        Document copy = new Document(doc);
        copy.remove("_id");
        return copy;
    }

    public IssueVote recordVote(IssueVote vote) {
        if (vote == null) {
            throw new IllegalArgumentException("Vote record cannot be null.");
        }
        if (vote.getUserId() == null || vote.getUserId().isBlank()) {
            throw new IllegalArgumentException("user_id is required.");
        }
        if (vote.getSource() == null || vote.getSource().isBlank()) {
            throw new IllegalArgumentException("source is required.");
        }
        if (vote.getPlatformIssueId() == null || vote.getPlatformIssueId().isBlank()) {
            throw new IllegalArgumentException("platform_issue_id is required.");
        }
        if (vote.getVote() != 1 && vote.getVote() != -1) {
            throw new IllegalArgumentException("Vote value must be +1 (like) or -1 (dislike).");
        }

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        String key = vote.getUserId() + ":" + vote.getSource() + ":" + vote.getPlatformIssueId();

        if (vote.getCreatedAt() == null || vote.getCreatedAt().isBlank()) {
            vote.setCreatedAt(nowIso);
        }
        vote.setUpdatedAt(nowIso);

        if (isMongoActive()) {
            try {
                var collection = mongoTemplate.getCollection(COLLECTION_NAME);

                Document filter = new Document("user_id", vote.getUserId())
                        .append("source", vote.getSource())
                        .append("platform_issue_id", vote.getPlatformIssueId());

                Document setFields = new Document("vote", vote.getVote())
                        .append("updated_at", nowIso);
                if (vote.getReason() != null) {
                    setFields.append("reason", vote.getReason());
                }
                if (vote.getRecommendationRunId() != null) {
                    setFields.append("recommendation_run_id", vote.getRecommendationRunId());
                }
                if (vote.getFeatureSnapshot() != null && !vote.getFeatureSnapshot().isEmpty()) {
                    setFields.append("feature_snapshot", vote.getFeatureSnapshot());
                }

                Document setOnInsert = new Document("user_id", vote.getUserId())
                        .append("source", vote.getSource())
                        .append("platform_issue_id", vote.getPlatformIssueId())
                        .append("created_at", vote.getCreatedAt());

                Document updateDoc = new Document("$set", setFields)
                        .append("$setOnInsert", setOnInsert);

                collection.updateOne(filter, updateDoc, new com.mongodb.client.model.UpdateOptions().upsert(true));

                Document saved = collection.find(filter).first();
                if (saved != null) {
                    IssueVote v = objectMapper.convertValue(cleanDoc(saved), IssueVote.class);
                    inMemoryVotes.put(key, v);
                    return v;
                }
            } catch (Exception e) {
                logger.warn("MongoDB vote recording failed ({}), falling back to in-memory store.", e.getMessage());
            }
        }

        inMemoryVotes.put(key, vote);
        return vote;
    }

    public boolean removeVote(String userId, String source, String platformIssueId) {
        if (userId == null || userId.isBlank() || source == null || source.isBlank() || platformIssueId == null || platformIssueId.isBlank()) {
            return false;
        }

        String key = userId + ":" + source + ":" + platformIssueId;
        boolean inMemDeleted = inMemoryVotes.remove(key) != null;

        if (isMongoActive()) {
            try {
                Document filter = new Document("user_id", userId)
                        .append("source", source)
                        .append("platform_issue_id", platformIssueId);

                var result = mongoTemplate.getCollection(COLLECTION_NAME).deleteOne(filter);
                return result.getDeletedCount() > 0 || inMemDeleted;
            } catch (Exception e) {
                logger.warn("MongoDB vote removal failed ({}).", e.getMessage());
            }
        }

        return inMemDeleted;
    }

    public Optional<IssueVote> getVote(String userId, String source, String platformIssueId) {
        if (userId == null || source == null || platformIssueId == null) {
            return Optional.empty();
        }

        String key = userId + ":" + source + ":" + platformIssueId;

        if (isMongoActive()) {
            try {
                Document filter = new Document("user_id", userId)
                        .append("source", source)
                        .append("platform_issue_id", platformIssueId);

                Document doc = mongoTemplate.getCollection(COLLECTION_NAME).find(filter).first();
                if (doc != null) {
                    return Optional.ofNullable(objectMapper.convertValue(cleanDoc(doc), IssueVote.class));
                }
            } catch (Exception ignored) {}
        }

        return Optional.ofNullable(inMemoryVotes.get(key));
    }

    public List<IssueVote> getUserVotes(String userId) {
        if (userId == null || userId.isBlank()) {
            return Collections.emptyList();
        }

        if (isMongoActive()) {
            try {
                List<IssueVote> list = new ArrayList<>();
                var cursor = mongoTemplate.getCollection(COLLECTION_NAME)
                        .find(new Document("user_id", userId))
                        .sort(new Document("updated_at", -1));

                for (Document doc : cursor) {
                    try {
                        IssueVote v = objectMapper.convertValue(cleanDoc(doc), IssueVote.class);
                        if (v != null) list.add(v);
                    } catch (Exception e) {
                        logger.warn("Could not deserialize IssueVote document: {}", e.getMessage());
                    }
                }
                if (!list.isEmpty()) {
                    return list;
                }
            } catch (Exception ignored) {}
        }

        List<IssueVote> list = new ArrayList<>();
        for (IssueVote v : inMemoryVotes.values()) {
            if (userId.equals(v.getUserId())) {
                list.add(v);
            }
        }
        list.sort((a, b) -> Objects.compare(b.getUpdatedAt(), a.getUpdatedAt(), Comparator.nullsLast(String::compareTo)));
        return list;
    }

    public Map<String, Integer> countUserVotes(String userId) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("likes", 0);
        counts.put("dislikes", 0);
        counts.put("total", 0);

        if (userId == null || userId.isBlank()) {
            return counts;
        }

        if (isMongoActive()) {
            try {
                var col = mongoTemplate.getCollection(COLLECTION_NAME);
                int likes = (int) col.countDocuments(new Document("user_id", userId).append("vote", 1));
                int dislikes = (int) col.countDocuments(new Document("user_id", userId).append("vote", -1));

                counts.put("likes", likes);
                counts.put("dislikes", dislikes);
                counts.put("total", likes + dislikes);
                return counts;
            } catch (Exception ignored) {}
        }

        int likes = 0;
        int dislikes = 0;
        for (IssueVote v : inMemoryVotes.values()) {
            if (userId.equals(v.getUserId())) {
                if (v.getVote() == 1) likes++;
                else if (v.getVote() == -1) dislikes++;
            }
        }
        counts.put("likes", likes);
        counts.put("dislikes", dislikes);
        counts.put("total", likes + dislikes);
        return counts;
    }
}
