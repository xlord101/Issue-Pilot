package com.issuepilot.adapter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class IssueQualityFilterTest {

    @Test
    @DisplayName("1. Rejects CJK non-Latin titles (Japanese, Chinese, Korean)")
    public void testRejectsCjkTitles() {
        assertFalse(IssueQualityFilter.isQualityIssue("TASK-11 (8/10): Firefox でも流す", "Some body description for the task.", null));
        assertFalse(IssueQualityFilter.isQualityIssue("feat(console): 多视图诊断、五维风险解释与统一视觉", "Chinese description here.", null));
        assertFalse(IssueQualityFilter.isQualityIssue("FR-10 run_recipe 레시피 실행", "Korean recipe execution description.", null));
    }

    @Test
    @DisplayName("2. Rejects student homework and internal sprint task patterns")
    public void testRejectsHomeworkPatterns() {
        assertFalse(IssueQualityFilter.isQualityIssue(
                "[0.6] Merge all report sections into one document",
                "Task 0.6 from CHECKLIST.md for student report.",
                null
        ));
        assertFalse(IssueQualityFilter.isQualityIssue(
                "[0.7] Cross-review: each member reviews one other section and code",
                "Each member reads one other member's report section and code.",
                List.of("team", "blocked")
        ));
        assertFalse(IssueQualityFilter.isQualityIssue(
                "TASK-11: Implement login flow",
                "Some internal task description that has enough characters.",
                null
        ));
    }

    @Test
    @DisplayName("3. Rejects blocked and WIP labels")
    public void testRejectsBlockedLabels() {
        assertFalse(IssueQualityFilter.isQualityIssue(
                "Refactor authentication token handler",
                "This issue refactors the legacy token handling mechanism to use HS256.",
                List.of("blocked")
        ));
        assertFalse(IssueQualityFilter.isQualityIssue(
                "Refactor authentication token handler",
                "This issue refactors the legacy token handling mechanism to use HS256.",
                List.of("wip")
        ));
        assertFalse(IssueQualityFilter.isQualityIssue(
                "Refactor authentication token handler",
                "This issue refactors the legacy token handling mechanism to use HS256.",
                List.of("do not merge")
        ));
    }

    @Test
    @DisplayName("4. Rejects vague, short or empty bodies")
    public void testRejectsVagueIssues() {
        assertFalse(IssueQualityFilter.isQualityIssue("Fix bug", "Short", null));
        assertFalse(IssueQualityFilter.isQualityIssue("Fix something in the codebase", "", null));
        assertFalse(IssueQualityFilter.isQualityIssue("Fix something in the codebase", "Too short", null));
    }

    @Test
    @DisplayName("5. Accepts real, well-formed open-source issues")
    public void testAcceptsQualityIssues() {
        assertTrue(IssueQualityFilter.isQualityIssue(
                "Support IMGPROXY_ONLY_PRESETS URL format",
                "Currently imgproxy presets are passed via query string. We should support URL format as well.",
                List.of("good first issue", "enhancement")
        ));
        assertTrue(IssueQualityFilter.isQualityIssue(
                "Add Python 3.12 to CI test matrix for complete version coverage",
                "The current CI matrix only tests up to Python 3.11. Update GitHub Actions workflow to include 3.12.",
                List.of("ci", "help wanted")
        ));
    }
}
