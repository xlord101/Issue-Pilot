import { useState, useMemo, useEffect } from "react";
import {
  Compass,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  Target,
  Sliders,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { StarterProfile } from "@/lib/api";

export interface CalibrationData {
  experience: "first_time" | "familiar" | "seasoned";
  navigation: "surgical" | "modular" | "architectural";
  challengeGoal: "quick_win" | "deep_dive" | "high_impact";
  stack: Record<string, number>; // technology name -> proficiency 0 to 100
  derivedCapability: number; // 0 to 100
  confidenceScore: number; // 0.0 to 1.0
}

const TECH_OPTIONS = [
  "TypeScript",
  "Python",
  "React",
  "C++",
  "Java",
  "Go",
  "Rust",
  "FastAPI",
  "MongoDB",
  "Docker",
];

const EXPERIENCE_OPTIONS = [
  {
    id: "first_time" as const,
    title: "First-Time Contributor",
    desc: "Seeking first merged PR. Need explicit reproduction steps, good-first-issue labels, and welcoming maintainers.",
    baseCapability: 42,
  },
  {
    id: "familiar" as const,
    title: "Comfortable with Git & PRs",
    desc: "Have submitted multiple pull requests. Comfortable running test suites and navigating unfamiliar code.",
    baseCapability: 68,
  },
  {
    id: "seasoned" as const,
    title: "Seasoned OSS Contributor",
    desc: "Regularly author features, review code, and understand maintainer priorities and release management.",
    baseCapability: 88,
  },
];

const NAVIGATION_OPTIONS = [
  {
    id: "surgical" as const,
    title: "Surgical / Isolated",
    desc: "Prefer single-file bug fixes, well-isolated unit tests, or clear documentation enhancements.",
    delta: -4,
  },
  {
    id: "modular" as const,
    title: "Modular Subsystems",
    desc: "Comfortable tracing execution flow across multiple modules, packages, and dependency boundaries.",
    delta: 5,
  },
  {
    id: "architectural" as const,
    title: "Architectural & Concurrency",
    desc: "Thrive in complex asynchronous event loops, memory management, protocol layers, and distributed systems.",
    delta: 12,
  },
];

const GOAL_OPTIONS = [
  {
    id: "quick_win" as const,
    title: "Quick Afternoon Win",
    desc: "Get an issue scoped and resolved quickly to establish momentum in a new repository.",
    delta: -2,
  },
  {
    id: "deep_dive" as const,
    title: "Substantial Feature / Deep Dive",
    desc: "Tackle a meaningful subsystem, redesign an API endpoint, or refactor core functionality.",
    delta: 4,
  },
  {
    id: "high_impact" as const,
    title: "High-Impact Stretch Goal",
    desc: "Solve critical bottlenecks, upstream RFC proposals, or long-standing architectural debt.",
    delta: 8,
  },
];

export function BehavioralCalibrationDeck({
  initialProfile,
  onComplete,
  pending,
}: {
  initialProfile?: {
    skills?: { name: string; strength: number }[];
    preferences?: Record<string, any>;
    capability?: number | null;
  } | null;
  onComplete: (data: CalibrationData) => void;
  pending?: boolean;
}) {
  const initialData = useMemo(() => {
    let exp: "first_time" | "familiar" | "seasoned" = "familiar";
    let nav: "surgical" | "modular" | "architectural" = "modular";
    let goal: "quick_win" | "deep_dive" | "high_impact" = "deep_dive";
    let stack: Record<string, number> = {
      TypeScript: 80,
      Python: 75,
      React: 70,
    };

    if (initialProfile) {
      const pExp = initialProfile.preferences?.open_source_experience;
      if (pExp === "first_time" || pExp === "familiar" || pExp === "seasoned") {
        exp = pExp;
      }
      const pNav = initialProfile.preferences?.codebase_navigation_comfort;
      if (pNav === "surgical" || pNav === "modular" || pNav === "architectural") {
        nav = pNav;
      }
      const pGoal = initialProfile.preferences?.target_challenge_goal;
      if (pGoal === "quick_win" || pGoal === "deep_dive" || pGoal === "high_impact") {
        goal = pGoal;
      }

      if (initialProfile.skills && initialProfile.skills.length > 0) {
        const loadedStack: Record<string, number> = {};
        for (const s of initialProfile.skills) {
          if (s.name) {
            const score = s.strength > 1 ? Math.round(s.strength) : Math.round(s.strength * 100);
            const canonical = TECH_OPTIONS.find((t) => t.toLowerCase() === s.name.toLowerCase()) || s.name;
            loadedStack[canonical] = Math.max(30, Math.min(100, score || 75));
          }
        }
        if (Object.keys(loadedStack).length > 0) {
          stack = loadedStack;
        }
      }
    }
    return { exp, nav, goal, stack };
  }, [initialProfile]);

  const [step, setStep] = useState<number>(1);
  const [experience, setExperience] = useState<"first_time" | "familiar" | "seasoned">(initialData.exp);
  const [navigation, setNavigation] = useState<"surgical" | "modular" | "architectural">(initialData.nav);
  const [challengeGoal, setChallengeGoal] = useState<"quick_win" | "deep_dive" | "high_impact">(initialData.goal);
  const [selectedTechs, setSelectedTechs] = useState<Record<string, number>>(initialData.stack);

  // Sync state when initialProfile loads or updates asynchronously
  useEffect(() => {
    setExperience(initialData.exp);
    setNavigation(initialData.nav);
    setChallengeGoal(initialData.goal);
    setSelectedTechs(initialData.stack);
  }, [initialData]);

  const { derivedCapability, confidenceScore } = useMemo(() => {
    const expObj = EXPERIENCE_OPTIONS.find((e) => e.id === experience)!;
    const navObj = NAVIGATION_OPTIONS.find((n) => n.id === navigation)!;
    const goalObj = GOAL_OPTIONS.find((g) => g.id === challengeGoal)!;

    const base = expObj.baseCapability + navObj.delta + goalObj.delta;

    const techCount = Object.keys(selectedTechs).length;
    const avgTechScore =
      techCount > 0
        ? Object.values(selectedTechs).reduce((a, b) => a + b, 0) / techCount
        : 50;

    const blended = Math.round(base * 0.65 + avgTechScore * 0.35);
    const clamped = Math.max(25, Math.min(98, blended));

    const confidence = Math.min(0.95, 0.65 + techCount * 0.06);

    return { derivedCapability: clamped, confidenceScore: Math.round(confidence * 100) / 100 };
  }, [experience, navigation, challengeGoal, selectedTechs]);

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) => {
      const copy = { ...prev };
      if (copy[tech] !== undefined) {
        delete copy[tech];
      } else {
        copy[tech] = 75;
      }
      return copy;
    });
  };

  const setTechScore = (tech: string, score: number) => {
    setSelectedTechs((prev) => ({
      ...prev,
      [tech]: score,
    }));
  };

  const handleFinish = () => {
    onComplete({
      experience,
      navigation,
      challengeGoal,
      stack: selectedTechs,
      derivedCapability,
      confidenceScore,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Dial / Calibrated Live Metrics Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-mono text-2xl font-bold shadow-xs">
              {derivedCapability}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" />
                Calibrated Contributor Capability
              </div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">
                Target Score Range:{" "}
                <span className="font-mono text-blue-700 font-bold">
                  {Math.max(20, derivedCapability - 15)} – {Math.min(100, derivedCapability + 15)} pts
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 uppercase text-[10px]">Model Confidence</span>
              <span className="text-emerald-700 font-bold">{Math.round(confidenceScore * 100)}%</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col items-end">
              <span className="text-slate-500 uppercase text-[10px]">Active Stack</span>
              <span className="text-blue-700 font-bold">{Object.keys(selectedTechs).length} technologies</span>
            </div>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 font-mono transition-all active:scale-[0.98]",
                  step === s
                    ? "border border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : s < step
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                    : "border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800"
                )}
              >
                <span>0{s}</span>
                <span>
                  {s === 1 ? "Behavioral Anchors" : s === 2 ? "Tech Stack" : "Confirm & Save"}
                </span>
              </button>
            ))}
          </div>
          <span className="font-mono text-slate-500">Step {step} of 3</span>
        </div>
      </div>

      {/* Step 1: 3-Question Behavioral Calibration Deck */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Question 1: Experience Anchor */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
              Anchor 1 / 3
            </span>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              What is your current open-source contribution rhythm?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Calibrates how strictly the ranking engine discounts complex multi-file pull requests.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    experience === opt.id
                      ? "border-2 border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                    {experience === opt.id && <Check className="size-4 text-blue-600" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Codebase Navigation Comfort */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
              Anchor 2 / 3
            </span>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              How do you prefer navigating unfamiliar repositories?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Tunes difficulty tolerance and weight ($D$) in the 6-factor model.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {NAVIGATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNavigation(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    navigation === opt.id
                      ? "border-2 border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                    {navigation === opt.id && <Check className="size-4 text-blue-600" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Challenge Goal */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
              Anchor 3 / 3
            </span>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              What outcome are you pursuing in your next contribution sprint?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Balances maintainer responsiveness ($R$) against issue architectural depth.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChallengeGoal(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    challengeGoal === opt.id
                      ? "border-2 border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                    {challengeGoal === opt.id && <Check className="size-4 text-blue-600" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep(2)}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 active:scale-[0.98] shadow-sm"
            >
              Continue to Tech Stack
              <ChevronRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Tech Stack & Proficiency Tuning */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Select Languages &amp; Core Frameworks
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              The ranking engine evaluates direct technology matches and cross-ecosystem affinity.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {TECH_OPTIONS.map((t) => {
                const selected = selectedTechs[t] !== undefined;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTech(t)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-mono transition-all active:scale-[0.98]",
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {selected ? `✓ ${t}` : `+ ${t}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proficiency Sliders for Selected Techs */}
          {Object.keys(selectedTechs).length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Proficiency Level Calibration
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(selectedTechs).map(([tech, score]) => (
                  <div key={tech} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-900">{tech}</span>
                      <span className="text-blue-700 font-bold">{score}%</span>
                    </div>
                    <Slider
                      value={[score]}
                      min={10}
                      max={100}
                      step={5}
                      onValueChange={([val]) => {
                        if (val != null) setTechScore(tech, val);
                      }}
                      className="cursor-pointer py-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={Object.keys(selectedTechs).length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 active:scale-[0.98] shadow-sm"
            >
              Review Calibration Summary
              <ChevronRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation & Launch */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
              <ShieldCheck className="size-5 text-emerald-600" />
              Calibration Complete &amp; Ready to Commit
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  Open Source Experience
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                  {experience.replace("_", " ")}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  Navigation Comfort
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                  {navigation}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  Sprint Goal
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                  {challengeGoal.replace("_", " ")}
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600">Calibrated Tech Stack:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(selectedTechs).map(([t, s]) => (
                  <span
                    key={t}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-800 flex items-center gap-1.5"
                  >
                    <span>{t}</span>
                    <span className="text-blue-700 font-bold">{s}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Modify Stack
            </Button>
            <Button
              onClick={handleFinish}
              disabled={pending}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-8 text-sm shadow-sm active:scale-[0.98]"
            >
              {pending ? "Saving Calibration…" : "Confirm Calibration & Launch Feed"}
              <Sparkles className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Backward compatibility summary
export function StarterSummary({ p }: { p: StarterProfile }) {
  const rows: [string, string][] = [
    ["Languages", p.languages.join(", ") || "—"],
    ["Technologies", p.technologies.join(", ") || "—"],
    ["Experience", p.experience],
    ["Interests", p.interests.join(", ") || "—"],
    ["Preferred contributions", p.contribution_areas.join(", ") || "—"],
  ];
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="first-letter:uppercase text-slate-800 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}