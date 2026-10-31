package com.issuepilot.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.issuepilot.config.MongoConfig;
import com.issuepilot.model.ContributorProfile;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class UserRepository {

    private static final Logger logger = LoggerFactory.getLogger(UserRepository.class);

    private final MongoOperations mongoTemplate;
    private final ObjectMapper objectMapper;
    private final MongoConfig mongoConfig;
    private final Map<String, Map<String, Object>> inMemoryUsers = new ConcurrentHashMap<>();

    public UserRepository(MongoOperations mongoTemplate, ObjectMapper objectMapper) {
        this(mongoTemplate, objectMapper, null);
    }

    @Autowired
    public UserRepository(MongoOperations mongoTemplate, ObjectMapper objectMapper, @Autowired(required = false) MongoConfig mongoConfig) {
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

    private Document cleanDoc(Document doc) {
        if (doc == null) {
            return null;
        }
        Document copy = new Document(doc);
        copy.remove("_id");
        return copy;
    }

    public Map<String, Object> getUser(String userId) {
        if (userId == null || userId.isBlank()) return null;

        if (isMongoActive()) {
            try {
                Document doc = mongoTemplate.getCollection("users").find(new Document("user_id", userId)).first();
                if (doc != null) {
                    Map<String, Object> clean = cleanDoc(doc);
                    inMemoryUsers.put(userId, clean);
                    return clean;
                }
            } catch (Exception ignored) {}
        }
        return inMemoryUsers.get(userId);
    }

    public Map<String, Object> findByProviderIdentity(String provider, String providerUserId) {
        if (provider == null || providerUserId == null) return null;

        if (isMongoActive()) {
            try {
                Document filter = new Document("identity.provider", provider.trim())
                        .append("identity.provider_user_id", providerUserId.trim());
                Document doc = mongoTemplate.getCollection("users").find(filter).first();
                if (doc != null) {
                    Map<String, Object> clean = cleanDoc(doc);
                    if (clean.get("user_id") != null) {
                        inMemoryUsers.put(String.valueOf(clean.get("user_id")), clean);
                    }
                    return clean;
                }
            } catch (Exception ignored) {}
        }

        for (Map<String, Object> u : inMemoryUsers.values()) {
            Object idObj = u.get("identity");
            if (idObj instanceof Map) {
                Map<?, ?> idMap = (Map<?, ?>) idObj;
                if (provider.equalsIgnoreCase(String.valueOf(idMap.get("provider")))
                        && providerUserId.equals(String.valueOf(idMap.get("provider_user_id")))) {
                    return u;
                }
            }
        }
        return null;
    }

    public Map<String, Object> createUser(ContributorProfile profile) {
        if (profile == null || profile.getUserId() == null || profile.getUserId().isBlank()) {
            throw new IllegalArgumentException("Valid profile and user_id are required.");
        }
        String userId = profile.getUserId();
        if (getUser(userId) != null) {
            throw new IllegalArgumentException("User with ID '" + userId + "' already exists.");
        }

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        profile.setCreatedAt(nowIso);
        profile.setUpdatedAt(nowIso);

        Map<String, Object> map = objectMapper.convertValue(profile, new TypeReference<Map<String, Object>>() {});
        inMemoryUsers.put(userId, new LinkedHashMap<>(map));

        if (isMongoActive()) {
            try {
                Document doc = new Document(map);
                mongoTemplate.getCollection("users").insertOne(doc);
                return cleanDoc(doc);
            } catch (Exception e) {
                logger.warn("MongoDB createUser failed ({}), saved in memory.", e.getMessage());
            }
        }
        return map;
    }

    public Map<String, Object> updateUser(String userId, Map<String, Object> updates) {
        if (userId == null || getUser(userId) == null) {
            return null;
        }

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        Map<String, Object> existing = inMemoryUsers.get(userId);
        if (existing == null) {
            existing = getUser(userId);
        }
        if (existing != null) {
            existing.putAll(updates);
            existing.put("updated_at", nowIso);
            inMemoryUsers.put(userId, existing);
        }

        if (isMongoActive()) {
            try {
                Map<String, Object> serializedUpdates = objectMapper.convertValue(updates, new TypeReference<Map<String, Object>>() {});
                Document updateFields = new Document(serializedUpdates);
                updateFields.remove("_id");
                updateFields.remove("user_id");
                updateFields.put("updated_at", nowIso);

                mongoTemplate.getCollection("users").updateOne(
                        new Document("user_id", userId),
                        new Document("$set", updateFields)
                );
            } catch (Exception e) {
                logger.warn("MongoDB updateUser failed ({}), updated in memory.", e.getMessage());
            }
        }

        return getUser(userId);
    }

    /**
     * Atomically provisions or updates an authenticated OAuth user profile without
     * overwriting confirmed skills or preferences.
     */
    public Map<String, Object> provisionOrUpdateOAuthUser(
            String provider,
            String providerUserId,
            String username,
            String displayName,
            String avatarUrl,
            String profileUrl,
            String email
    ) {
        if (provider == null || provider.isBlank() || providerUserId == null || providerUserId.isBlank()) {
            throw new IllegalArgumentException("Provider and providerUserId are required for OAuth provisioning.");
        }

        String canonicalUserId = provider.trim().toLowerCase() + ":" + providerUserId.trim();
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        if (isMongoActive()) {
            try {
                Document identityDoc = new Document("provider", provider.trim().toLowerCase())
                        .append("provider_user_id", providerUserId.trim())
                        .append("username", username != null ? username.trim() : "")
                        .append("display_name", displayName != null ? displayName.trim() : "")
                        .append("avatar_url", avatarUrl != null ? avatarUrl.trim() : "")
                        .append("profile_url", profileUrl != null ? profileUrl.trim() : "")
                        .append("email", email != null ? email.trim() : "");

                Document setFields = new Document("identity", identityDoc)
                        .append("updated_at", nowIso)
                        .append("last_active_at", nowIso);

                Document setOnInsert = new Document("user_id", canonicalUserId)
                        .append("capability", 70.0)
                        .append("skills", new Document())
                        .append("inferred_skills", Collections.emptyList())
                        .append("preferences", new Document())
                        .append("onboarding_completed", false)
                        .append("accepted_count", 0)
                        .append("rejected_count", 0)
                        .append("completed_count", 0)
                        .append("similarity_to_history", 75.0)
                        .append("has_feedback_history", false)
                        .append("created_at", nowIso);

                Document updateDoc = new Document("$set", setFields).append("$setOnInsert", setOnInsert);

                Document filter = new Document("identity.provider", provider.trim().toLowerCase())
                        .append("identity.provider_user_id", providerUserId.trim());

                com.mongodb.client.model.FindOneAndUpdateOptions options = new com.mongodb.client.model.FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(com.mongodb.client.model.ReturnDocument.AFTER);

                Document result = mongoTemplate.getCollection("users").findOneAndUpdate(filter, updateDoc, options);
                Map<String, Object> clean = cleanDoc(result);
                if (clean != null) {
                    inMemoryUsers.put(canonicalUserId, clean);
                    return clean;
                }
            } catch (Exception e) {
                logger.warn("MongoDB provisionOrUpdateOAuthUser failed ({}), using in-memory fallback.", e.getMessage());
            }
        }

        Map<String, Object> existing = inMemoryUsers.get(canonicalUserId);
        if (existing == null) {
            existing = new LinkedHashMap<>();
            existing.put("user_id", canonicalUserId);
            existing.put("capability", 70.0);
            existing.put("skills", new LinkedHashMap<>());
            existing.put("inferred_skills", Collections.emptyList());
            existing.put("preferences", new LinkedHashMap<>());
            existing.put("onboarding_completed", false);
            existing.put("accepted_count", 0);
            existing.put("rejected_count", 0);
            existing.put("completed_count", 0);
            existing.put("similarity_to_history", 75.0);
            existing.put("has_feedback_history", false);
            existing.put("created_at", nowIso);
        }

        Map<String, Object> identityDoc = new LinkedHashMap<>();
        identityDoc.put("provider", provider.trim().toLowerCase());
        identityDoc.put("provider_user_id", providerUserId.trim());
        identityDoc.put("username", username != null ? username.trim() : "");
        identityDoc.put("display_name", displayName != null ? displayName.trim() : "");
        identityDoc.put("avatar_url", avatarUrl != null ? avatarUrl.trim() : "");
        identityDoc.put("profile_url", profileUrl != null ? profileUrl.trim() : "");
        identityDoc.put("email", email != null ? email.trim() : "");

        existing.put("identity", identityDoc);
        existing.put("updated_at", nowIso);
        existing.put("last_active_at", nowIso);
        inMemoryUsers.put(canonicalUserId, existing);
        return existing;
    }

    public Map<String, Object> upsertUser(ContributorProfile profile) {
        if (profile == null || profile.getUserId() == null || profile.getUserId().isBlank()) {
            throw new IllegalArgumentException("Valid profile and user_id are required.");
        }

        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        Map<String, Object> map = objectMapper.convertValue(profile, new TypeReference<Map<String, Object>>() {});
        map.remove("user_id");
        map.remove("_id");
        map.remove("created_at");
        map.put("updated_at", nowIso);

        Map<String, Object> inMem = inMemoryUsers.get(profile.getUserId());
        if (inMem == null) {
            inMem = new LinkedHashMap<>();
            inMem.put("user_id", profile.getUserId());
            inMem.put("created_at", nowIso);
        }
        inMem.putAll(map);
        inMemoryUsers.put(profile.getUserId(), inMem);

        if (isMongoActive()) {
            try {
                Document setDoc = new Document(map);
                Document setOnInsert = new Document("created_at", nowIso);

                Document updateDoc = new Document("$set", setDoc).append("$setOnInsert", setOnInsert);

                mongoTemplate.getCollection("users").updateOne(
                        new Document("user_id", profile.getUserId()),
                        updateDoc,
                        new com.mongodb.client.model.UpdateOptions().upsert(true)
                );
            } catch (Exception e) {
                logger.warn("MongoDB upsertUser failed ({}), updated in memory.", e.getMessage());
            }
        }

        return getUser(profile.getUserId());
    }

    public List<Map<String, Object>> listUsers(int limit, int skip) {
        if (isMongoActive()) {
            try {
                List<Map<String, Object>> results = new ArrayList<>();
                var cursor = mongoTemplate.getCollection("users")
                        .find()
                        .sort(new Document("updated_at", -1))
                        .skip(skip)
                        .limit(limit);

                for (Document d : cursor) {
                    results.add(cleanDoc(d));
                }
                return results;
            } catch (Exception ignored) {}
        }

        List<Map<String, Object>> list = new ArrayList<>(inMemoryUsers.values());
        int start = Math.min(skip, list.size());
        int end = Math.min(start + limit, list.size());
        return new ArrayList<>(list.subList(start, end));
    }

    public boolean deleteUser(String userId) {
        if (userId == null) return false;
        boolean inMemDeleted = inMemoryUsers.remove(userId) != null;

        if (isMongoActive()) {
            try {
                var res = mongoTemplate.getCollection("users").deleteOne(new Document("user_id", userId));
                return res.getDeletedCount() > 0 || inMemDeleted;
            } catch (Exception ignored) {}
        }
        return inMemDeleted;
    }

    public List<ContributorProfile> findActiveUsers(Instant since, int limit) {
        if (isMongoActive()) {
            try {
                String sinceIso = DateTimeFormatter.ISO_INSTANT.format(since);
                Document filter = new Document("$or", List.of(
                        new Document("last_active_at", new Document("$gte", sinceIso)),
                        new Document("$and", List.of(
                                new Document("last_active_at", null),
                                new Document("updated_at", new Document("$gte", sinceIso))
                        ))
                ));

                List<ContributorProfile> activeProfiles = new ArrayList<>();
                var cursor = mongoTemplate.getCollection("users")
                        .find(filter)
                        .sort(new Document("updated_at", -1))
                        .limit(limit);

                for (Document d : cursor) {
                    Map<String, Object> clean = cleanDoc(d);
                    if (clean != null) {
                        try {
                            ContributorProfile p = objectMapper.convertValue(clean, ContributorProfile.class);
                            activeProfiles.add(p);
                        } catch (Exception ignored) {}
                    }
                }
                return activeProfiles;
            } catch (Exception ignored) {}
        }

        List<ContributorProfile> activeProfiles = new ArrayList<>();
        for (Map<String, Object> clean : inMemoryUsers.values()) {
            try {
                ContributorProfile p = objectMapper.convertValue(clean, ContributorProfile.class);
                activeProfiles.add(p);
                if (activeProfiles.size() >= limit) break;
            } catch (Exception ignored) {}
        }
        return activeProfiles;
    }

    public Set<String> getActiveTechnologyPreferences(Instant since, int limit) {
        List<ContributorProfile> users = findActiveUsers(since, limit);
        Set<String> aggregated = new LinkedHashSet<>();
        for (ContributorProfile user : users) {
            if (user != null) {
                aggregated.addAll(user.getNormalizedTechnologyPreferences());
            }
        }
        return Collections.unmodifiableSet(aggregated);
    }
}
