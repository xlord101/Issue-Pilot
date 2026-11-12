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
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Repository storing hashed one-time verification codes in the 'email_otps' collection
 * with MongoDB TTL expiration and in-memory fallback.
 */
@Repository
public class EmailOtpRepository {

    private static final Logger logger = LoggerFactory.getLogger(EmailOtpRepository.class);
    private static final String COLLECTION_NAME = "email_otps";

    public static final String PURPOSE_VERIFICATION = "EMAIL_VERIFICATION";
    public static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";

    private final MongoOperations mongoOperations;
    private final MongoConfig mongoConfig;
    private final Map<String, Document> inMemoryStore = new ConcurrentHashMap<>();

    public EmailOtpRepository(MongoOperations mongoOperations) {
        this(mongoOperations, null);
    }

    @Autowired
    public EmailOtpRepository(
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

    private String key(String email, String purpose) {
        return email.trim().toLowerCase() + "::" + purpose.trim().toUpperCase();
    }

    private Document cleanCopy(Document doc) {
        if (doc == null) {
            return null;
        }
        Document copy = new Document(doc);
        copy.remove("_id");
        return copy;
    }

    public Document saveOtp(String email, String purpose, String otpHash, Instant expiresAt, Instant sentAt) {
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose.trim().toUpperCase();
        Date expiresDate = Date.from(expiresAt);
        Date sentDate = Date.from(sentAt);

        if (isMongoActive()) {
            try {
                Document filter = new Document("email", cleanEmail).append("purpose", cleanPurpose);
                Document setFields = new Document("email", cleanEmail)
                        .append("purpose", cleanPurpose)
                        .append("otp_hash", otpHash)
                        .append("expires_at", expiresDate)
                        .append("last_sent_at", sentDate)
                        .append("attempts", 0);

                Document setOnInsert = new Document("created_at", sentDate);
                Document updateDoc = new Document("$set", setFields).append("$setOnInsert", setOnInsert);

                FindOneAndUpdateOptions opts = new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(ReturnDocument.AFTER);

                Document saved = mongoOperations.getCollection(COLLECTION_NAME).findOneAndUpdate(filter, updateDoc, opts);
                if (saved != null) {
                    Document clean = cleanCopy(saved);
                    inMemoryStore.put(key(cleanEmail, cleanPurpose), clean);
                    return clean;
                }
            } catch (Exception e) {
                logger.warn("MongoDB saveOtp failed ({}), using in-memory store.", e.getMessage());
            }
        }

        Document doc = new Document("email", cleanEmail)
                .append("purpose", cleanPurpose)
                .append("otp_hash", otpHash)
                .append("expires_at", expiresDate)
                .append("last_sent_at", sentDate)
                .append("attempts", 0)
                .append("created_at", sentDate);
        inMemoryStore.put(key(cleanEmail, cleanPurpose), doc);
        return cleanCopy(doc);
    }

    public Document findOtp(String email, String purpose) {
        if (email == null || email.isBlank() || purpose == null || purpose.isBlank()) {
            return null;
        }
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose.trim().toUpperCase();

        if (isMongoActive()) {
            try {
                Document doc = mongoOperations.getCollection(COLLECTION_NAME)
                        .find(new Document("email", cleanEmail).append("purpose", cleanPurpose))
                        .first();
                if (doc != null) {
                    Document clean = cleanCopy(doc);
                    inMemoryStore.put(key(cleanEmail, cleanPurpose), clean);
                    return clean;
                }
            } catch (Exception e) {
                logger.warn("MongoDB findOtp failed ({}), checking in-memory store.", e.getMessage());
            }
        }
        return cleanCopy(inMemoryStore.get(key(cleanEmail, cleanPurpose)));
    }

    public int incrementAttempts(String email, String purpose) {
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose.trim().toUpperCase();
        String memKey = key(cleanEmail, cleanPurpose);

        if (isMongoActive()) {
            try {
                Document filter = new Document("email", cleanEmail).append("purpose", cleanPurpose);
                Document update = new Document("$inc", new Document("attempts", 1));
                FindOneAndUpdateOptions opts = new FindOneAndUpdateOptions()
                        .returnDocument(ReturnDocument.AFTER);
                Document updated = mongoOperations.getCollection(COLLECTION_NAME).findOneAndUpdate(filter, update, opts);
                if (updated != null) {
                    Document clean = cleanCopy(updated);
                    inMemoryStore.put(memKey, clean);
                    return updated.getInteger("attempts", 1);
                }
            } catch (Exception e) {
                logger.warn("MongoDB incrementAttempts failed ({}), updating in-memory store.", e.getMessage());
            }
        }

        Document mem = inMemoryStore.get(memKey);
        if (mem != null) {
            int next = mem.getInteger("attempts", 0) + 1;
            mem.put("attempts", next);
            return next;
        }
        return 1;
    }

    public void deleteOtp(String email, String purpose) {
        if (email == null || email.isBlank() || purpose == null || purpose.isBlank()) {
            return;
        }
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose.trim().toUpperCase();
        inMemoryStore.remove(key(cleanEmail, cleanPurpose));

        if (isMongoActive()) {
            try {
                mongoOperations.getCollection(COLLECTION_NAME)
                        .deleteOne(new Document("email", cleanEmail).append("purpose", cleanPurpose));
            } catch (Exception ignored) {}
        }
    }
}

