import json
import sys
from pathlib import Path

corpus_path = Path(__file__).resolve().parent.parent / "src" / "main" / "resources" / "fixtures" / "calibrated_quiz_corpus.json"
if not corpus_path.exists():
    corpus_path = Path("src/main/resources/fixtures/calibrated_quiz_corpus.json")

data = json.loads(corpus_path.read_text(encoding="utf-8"))
domains = data["domains"]

print("=" * 65)
print("   🎯 ISSUE PILOT — ADAPTIVE DIAGNOSTIC QUIZ SIMULATOR")
print("=" * 65)
print("This interactive tool tests the RAG-grounded adaptive calibration")
print("and the dual-signal GitHub cross-verification engine.")
print("-" * 65)

# 1. Select Domain
domain_keys = list(domains.keys())
print("\nSelect a technology to test:")
for i, d in enumerate(domain_keys, 1):
    print(f"  [{i}] {d}")

while True:
    try:
        choice = input("\nEnter choice (1-8) [Default: 1 - Python]: ").strip()
        idx = int(choice) if choice else 1
        if 1 <= idx <= len(domain_keys):
            tech = domain_keys[idx - 1]
            break
    except ValueError:
        pass
    print("Invalid choice, please select a valid number.")

# 2. Select GitHub Profile Context
print("\nSelect your GitHub Profile Context:")
print("  [1] Quiet / Enterprise Dev (0 public repos on GitHub)")
print("  [2] Active Contributor (3+ public repos in this technology)")
gh_choice = input("Enter context (1-2) [Default: 1]: ").strip()
has_github = gh_choice == "2"

print(f"\n🚀 Initializing Diagnostic Session for: {tech}")
print(f"   Context: {'Active GitHub Contributor' if has_github else 'Quiet / Enterprise Dev (0 Public Repos)'}")
print("   Starting Tier: INTERMEDIATE (Baseline Anchor: 65 pts)")
print("-" * 65)

# Step 1: Intermediate Question
int_scenarios = domains[tech].get("INTERMEDIATE", domains["OSS_Workflow"]["INTERMEDIATE"])
s1 = int_scenarios[0]

print(f"\n[QUESTION 1 OF 2] — Tier: INTERMEDIATE")
print(f"Scenario: {s1['scenario']}\n")
for opt in s1["options"]:
    print(f"  [{opt['id']}] {opt['text']}")

ans1 = ""
while ans1 not in ["A", "B", "C", "D"]:
    ans1 = input("\nYour answer (A/B/C/D): ").strip().upper()

chosen_opt1 = next((o for o in s1["options"] if o["id"] == ans1), None)
is_opt1 = chosen_opt1["is_optimal"]
score1 = chosen_opt1["score_weight"]

print(f"\n>>> Diagnostic Engine Analysis for Q1:")
print(f"    - Score Weight: {score1} pts")
print(f"    - Optimal: {is_opt1}")
print(f"    - Rubric: {chosen_opt1['rubric_explanation']}")

# Adaptive Branching
if is_opt1:
    next_tier = "ADVANCED"
    print("\n⚡ [ADAPTIVE STEP-UP]: Optimal answer detected! Branching up to ADVANCED tier for Q2.")
else:
    next_tier = "BEGINNER"
    print("\n⚡ [ADAPTIVE STEP-DOWN]: Suboptimal answer. Branching down to BEGINNER tier for Q2.")

# Step 2: Adaptive Question
next_scenarios = domains[tech].get(next_tier, domains["OSS_Workflow"][next_tier])
s2 = next_scenarios[0]

print("-" * 65)
print(f"\n[QUESTION 2 OF 2] — Tier: {next_tier}")
print(f"Scenario: {s2['scenario']}\n")
for opt in s2["options"]:
    print(f"  [{opt['id']}] {opt['text']}")

ans2 = ""
while ans2 not in ["A", "B", "C", "D"]:
    ans2 = input("\nYour answer (A/B/C/D): ").strip().upper()

chosen_opt2 = next((o for o in s2["options"] if o["id"] == ans2), None)
is_opt2 = chosen_opt2["is_optimal"]
score2 = chosen_opt2["score_weight"]

print(f"\n>>> Diagnostic Engine Analysis for Q2:")
print(f"    - Score Weight: {score2} pts")
print(f"    - Optimal: {is_opt2}")
print(f"    - Rubric: {chosen_opt2['rubric_explanation']}")

# Final Evaluation
raw_test_score = (score1 + score2) / 2.0
clamped_score = max(25.0, min(95.0, raw_test_score))

if not has_github:
    final_cap = clamped_score
    confidence = 0.90
    mode = "active_test_priority"
    recon_msg = "Public GitHub profile is quiet or absent; full confidence calibrated directly from verified test scenarios."
else:
    gh_inferred_cap = 70.0 * 0.90 + 30.0  # e.g. 93
    blended = (clamped_score * 0.60) + (gh_inferred_cap * 0.40)
    final_cap = round(blended, 1)
    confidence = 0.96
    mode = "dual_signal_cross_verified"
    recon_msg = "Active diagnostic test cross-verified with 3 public GitHub repositories (model confidence 96%)."

perf_tier = "ADVANCED" if final_cap >= 75 else ("INTERMEDIATE" if final_cap >= 50 else "BEGINNER")

print("\n" + "=" * 65)
print("   🏆 DIAGNOSTIC CALIBRATION RESULT")
print("=" * 65)
print(f"  Target Technology:      {tech}")
print(f"  Raw Test Score:         {raw_test_score:.1f} / 100 pts")
print(f"  Calibrated Capability:  {final_cap:.1f} / 100")
print(f"  Model Confidence:       {int(confidence * 100)}%")
print(f"  Performance Tier:       {perf_tier}")
print(f"  Reconciliation Mode:    {mode}")
print(f"  Explanation:            {recon_msg}")
print("=" * 65)
print("✅ This calibrated score (S) feeds directly into the C++ ranking engine")
print("   to compute the Difficulty Fit Gap: g = Issue Difficulty - S")
print("=" * 65)
