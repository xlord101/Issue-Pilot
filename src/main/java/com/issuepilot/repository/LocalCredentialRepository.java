package com.issuepilot.repository;

import com.issuepilot.config.MongoConfig;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.ReturnDocument;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Isolated repository for local email/password credentials ('local_credentials' collection).
 *
 * Keeping password hashes separate from 'users' profile documents prevents
 * accidental exposure through profile or user-lookup endpoints.
 */
@Repository
public class LocalCredentialRepository {

    private static final Logger logger = LoggerFactory.getLogger(LocalCredentialRepository.class);
    private static final String COLLECTION_NAME = "local_credentials";

    private final MongoOperations mongoOperations;
    private final MongoConfig mongoConfig;
    private final Map<String, Document> inMemoryStore = new ConcurrentHashMap<>();

    public LocalCredentialRepository(MongoOperations mongoOperations) {
        this(mongoOperations, null);
    }

    @Autowired
    public LocalCredentialRepository(
            @Autowired(required = false) MongoOperations mongoOperations,
            @Autowired(required = false) MongoConfig mongoConfig
    ) {
        this.mongoOperations = mongoOperations;
        this.mongoConfig = mongoConfig;
    }

    private boolean isMongoActive() {
        if (mongoOperations == null) {
            return false;
        }
        if (mongoConfig == null) {
            return true;
        }
        return mongoConfig.isConnected();
    }

    private Document cleanCopy(Document doc) {
        if (doc == null) {
            return null;
        }
        Document copy = new Document(doc);
        copy.remove("_id");
        return copy;
    }

    public Document findByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        String cleanEmail = email.trim().toLowerCase();

        if (isMongoActive()) {
            try {
                Document doc = mongoOperations.getCollection(COLLECTION_NAME)
                        .find(new Document("email", cleanEmail))
                        .first();
                if (doc != null) {
                    Document clean = cleanCopy(doc);
                    inMemoryStore.put(cleanEmail, clean);
                    return clean;
                }
            } catch (Exception e) {
                logger.warn("MongoDB findByEmail failed ({}), checking in-memory store.", e.getMessage());
            }
        }
        return cleanCopy(inMemoryStore.get(cleanEmail));
    }

    public Document upsertCredential(String userId, String email, String passwordHash, boolean emailVerified) {
        if (userId == null || userId.isBlank() || email == null || email.isBlank() || passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("userId, email, and passwordHash are required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        if (isMongoActive()) {
            try {
                Document setFields = new Document("user_id", userId.trim())
                        .append("email", cleanEmail)
                        .append("password_hash", passwordHash)
                        .append("email_verified", emailVerified)
                        .append("updated_at", nowIso);
                if (emailVerified) {
                    setFields.append("verified_at", nowIso);
                }

                Document setOnInsert = new Document("created_at", nowIso);
                Document updateDoc = new Document("$set", setFields).append("$setOnInsert", setOnInsert);

                FindOneAndUpdateOptions opts = new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(ReturnDocument.AFTER);

                Document updated = mongoOperations.getCollection(COLLECTION_NAME)
                        .findOneAndUpdate(new Document("email", cleanEmail), updateDoc, opts);
                if (updated != null) {
                    Document clean = cleanCopy(updated);
                    inMemoryStore.put(cleanEmail, clean);
                    return clean;
                }
            } catch (Exception e) {
                logger.warn("MongoDB upsertCredential failed ({}), saving to in-memory store.", e.getMessage());
            }
        }

        Document existing = inMemoryStore.get(cleanEmail);
        Document doc = existing != null ? new Document(existing) : new Document("created_at", nowIso);
        doc.put("user_id", userId.trim());
        doc.put("email", cleanEmail);
        doc.put("password_hash", passwordHash);
        doc.put("email_verified", emailVerified);
        doc.put("updated_at", nowIso);
        if (emailVerified) {
            doc.put("verified_at", nowIso);
        }
        inMemoryStore.put(cleanEmail, doc);
        return cleanCopy(doc);
    }

    public boolean markEmailVerified(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String cleanEmail = email.trim().toLowerCase();
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        if (isMongoActive()) {
            try {
                Document update = new Document("$set", new Document("email_verified", true)
                        .append("verified_at", nowIso)
                        .append("updated_at", nowIso));
                var res = mongoOperations.getCollection(COLLECTION_NAME)
                        .updateOne(new Document("email", cleanEmail), update);
                if (res.getMatchedCount() > 0) {
                    Document mem = inMemoryStore.get(cleanEmail);
                    if (mem != null) {
                        mem.put("email_verified", true);
                        mem.put("verified_at", nowIso);
                        mem.put("updated_at", nowIso);
                    }
                    return true;
                }
            } catch (Exception e) {
                logger.warn("MongoDB markEmailVerified failed ({}), updating in-memory store.", e.getMessage());
            }
        }

        Document mem = inMemoryStore.get(cleanEmail);
        if (mem != null) {
            mem.put("email_verified", true);
            mem.put("verified_at", nowIso);
            mem.put("updated_at", nowIso);
            return true;
        }
        return false;
    }

    public boolean updatePasswordHash(String email, String newPasswordHash) {
        if (email == null || email.isBlank() || newPasswordHash == null || newPasswordHash.isBlank()) {
            return false;
        }
        String cleanEmail = email.trim().toLowerCase();
        String nowIso = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        if (isMongoActive()) {
            try {
                Document update = new Document("$set", new Document("password_hash", newPasswordHash)
                        .append("updated_at", nowIso));
                var res = mongoOperations.getCollection(COLLECTION_NAME)
                        .updateOne(new Document("email", cleanEmail), update);
                if (res.getMatchedCount() > 0) {
                    Document mem = inMemoryStore.get(cleanEmail);
                    if (mem != null) {
                        mem.put("password_hash", newPasswordHash);
                        mem.put("updated_at", nowIso);
                    }
                    return true;
                }
            } catch (Exception e) {
                logger.warn("MongoDB updatePasswordHash failed ({}), updating in-memory store.", e.getMessage());
            }
        }

        Document mem = inMemoryStore.get(cleanEmail);
        if (mem != null) {
            mem.put("password_hash", newPasswordHash);
            mem.put("updated_at", nowIso);
            return true;
        }
        return false;
    }

    public boolean deleteByEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String cleanEmail = email.trim().toLowerCase();
        boolean removed = inMemoryStore.remove(cleanEmail) != null;

        if (isMongoActive()) {
            try {
                var res = mongoOperations.getCollection(COLLECTION_NAME).deleteOne(new Document("email", cleanEmail));
                return res.getDeletedCount() > 0 || removed;
            } catch (Exception ignored) {}
        }
        return removed;
    }
}

