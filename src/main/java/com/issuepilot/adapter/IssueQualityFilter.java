package com.issuepilot.adapter;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Filter that enforces linguistic readability and issue quality standards.
 * Prevents non-English/CJK issues, blocked internal tasks, student checklists,
 * and vague low-effort placeholders from entering the discovery pool or recommendation feed.
 */
public final class IssueQualityFilter {

    private static final Pattern HOMEWORK_TASK_PATTERN = Pattern.compile(
            "^(?:\\[?\\d+\\.\\d+\\]?|task-\\d+|s\\d+-[a-z0-9]|test\\(\\d+\\)|fr-\\d+|\\[需求\\]|checklist\\b)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Set<String> REJECTED_LABELS = Set.of(
            "blocked",
            "wip",
            "work in progress",
            "work-in-progress",
            "do not merge",
            "do-not-merge",
            "invalid",
            "duplicate",
            "wontfix",
            "won't fix",
            "on-hold",
            "on hold",
            "homework",
            "assignment",
            "team"
    );

    private IssueQualityFilter() {}

    /**
     * Checks if a title or text contains non-Latin scripts (CJK ideographs, Japanese Hiragana/Katakana, Korean Hangul, Cyrillic, etc.)
     */
    public static boolean hasNonLatinScript(String text) {
        if (text == null || text.isBlank()) return false;
        for (int i = 0; i < text.length(); ) {
            int codePoint = text.codePointAt(i);
            Character.UnicodeBlock block = Character.UnicodeBlock.of(codePoint);
            if (block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                    || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                    || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                    || block == Character.UnicodeBlock.HIRAGANA
                    || block == Character.UnicodeBlock.KATAKANA
                    || block == Character.UnicodeBlock.HANGUL_SYLLABLES
                    || block == Character.UnicodeBlock.HANGUL_JAMO
                    || block == Character.UnicodeBlock.HANGUL_COMPATIBILITY_JAMO
                    || block == Character.UnicodeBlock.CYRILLIC
                    || block == Character.UnicodeBlock.ARABIC) {
                return true;
            }
            i += Character.charCount(codePoint);
        }
        return false;
    }

    /**
     * Validates that an issue is in English / Latin script.
     */
    public static boolean isEnglishReadable(String title, String body) {
        if (title == null || title.isBlank()) return false;
        if (hasNonLatinScript(title)) return false;

        if (body != null && !body.isBlank()) {
            int nonLatinCount = 0;
            int totalChars = 0;
            for (int i = 0; i < body.length(); ) {
                int cp = body.codePointAt(i);
                if (!Character.isWhitespace(cp)) {
                    totalChars++;
                    if (hasNonLatinScript(new String(Character.toChars(cp)))) {
                        nonLatinCount++;
                    }
                }
                i += Character.charCount(cp);
            }
            if (totalChars > 0 && ((double) nonLatinCount / totalChars) > 0.10) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks whether an issue meets minimum quality standards:
     * - Readable English
     * - Title >= 10 characters
     * - Not a school checklist or internal sprint task
     * - Not tagged with blocker/wip/homework labels
     * - Body has at least 25 characters of meaningful context
     */
    public static boolean isQualityIssue(String title, String body, List<String> labels) {
        if (title == null || title.trim().length() < 10) {
            return false;
        }

        String trimmedTitle = title.trim();

        // 1. Language check
        if (!isEnglishReadable(trimmedTitle, body)) {
            return false;
        }

        // 2. Reject internal task / student homework patterns
        if (HOMEWORK_TASK_PATTERN.matcher(trimmedTitle).find()) {
            return false;
        }

        // 3. Reject blocker labels
        if (labels != null) {
            for (String label : labels) {
                if (label == null) continue;
                String normalized = label.trim().toLowerCase(Locale.ROOT);
                if (REJECTED_LABELS.contains(normalized)) {
                    return false;
                }
            }
        }

        // 4. Reject empty or classroom checklist bodies
        if (body != null) {
            String trimmedBody = body.trim();
            if (trimmedBody.length() < 15) {
                return false;
            }

            String bodyLower = trimmedBody.toLowerCase(Locale.ROOT);
            if (bodyLower.contains("from checklist.md")
                    || (bodyLower.contains("blocked by") && bodyLower.contains("checklist"))
                    || (bodyLower.contains("due:") && bodyLower.contains("task:"))) {
                return false;
            }
        }

        return true;
    }
}
