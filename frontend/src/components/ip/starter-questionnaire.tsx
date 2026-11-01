import { useState, useMemo } from "react";
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
  onComplete,
  pending,
}: {
  onComplete: (data: CalibrationData) => void;
  pending?: boolean;
}) {
  const [step, setStep] = useState<number>(1);
  const [experience, setExperience] = useState<"first_time" | "familiar" | "seasoned">("familiar");
  const [navigation, setNavigation] = useState<"surgical" | "modular" | "architectural">("modular");
  const [challengeGoal, setChallengeGoal] = useState<"quick_win" | "deep_dive" | "high_impact">("deep_dive");
  const [selectedTechs, setSelectedTechs] = useState<Record<string, number>>({
    TypeScript: 80,
    Python: 75,
    React: 70,
  });

  // Calculate derived capability rating (0-100) and confidence (0-1)
  const { derivedCapability, confidenceScore } = useMemo(() => {
    const expObj = EXPERIENCE_OPTIONS.find((e) => e.id === experience)!;
    const navObj = NAVIGATION_OPTIONS.find((n) => n.id === navigation)!;
    const goalObj = GOAL_OPTIONS.find((g) => g.id === challengeGoal)!;

    let base = expObj.baseCapability + navObj.delta + goalObj.delta;

    // Stack bonus
    const techCount = Object.keys(selectedTechs).length;
    const avgTechScore =
      techCount > 0
        ? Object.values(selectedTechs).reduce((a, b) => a + b, 0) / techCount
        : 50;

    const blended = Math.round(base * 0.65 + avgTechScore * 0.35);
    const clamped = Math.max(25, Math.min(98, blended));

    // Confidence: increases with number of stack items calibrated
    const confidence = Math.min(0.95, 0.65 + techCount * 0.06);

    return { derivedCapability: clamped, confidenceScore: Math.round(confidence * 100) / 100 };
  }, [experience, navigation, challengeGoal, selectedTechs]);

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) => {
      const copy = { ...prev };
      if (copy[tech] !== undefined) {
        delete copy[tech];
      } else {
        copy[tech] = 75; // default proficiency
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
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl specular-top shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary font-mono text-xl font-bold">
              {derivedCapability}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Zap className="size-3 text-amber-400" />
                Calibrated Contributor Capability
              </div>
              <div className="text-sm font-medium text-slate-200 mt-0.5">
                Target Score Range:{" "}
                <span className="font-mono text-primary font-bold">
                  {Math.max(20, derivedCapability - 15)} – {Math.min(100, derivedCapability + 15)} pts
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground uppercase text-[10px]">Model Confidence</span>
              <span className="text-emerald-400 font-semibold">{Math.round(confidenceScore * 100)}%</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground uppercase text-[10px]">Active Stack</span>
              <span className="text-cyan-400 font-semibold">{Object.keys(selectedTechs).length} technologies</span>
            </div>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 font-mono transition-all active:scale-[0.98]",
                  step === s
                    ? "border border-primary bg-primary/20 text-primary font-semibold"
                    : s < step
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                )}
              >
                <span>0{s}</span>
                <span>
                  {s === 1 ? "Behavioral Anchors" : s === 2 ? "Tech Stack" : "Confirm & Save"}
                </span>
              </button>
            ))}
          </div>
          <span className="font-mono text-muted-foreground">Step {step} of 3</span>
        </div>
      </div>

      {/* Step 1: 3-Question Behavioral Calibration Deck */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Question 1: Experience Anchor */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top">
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
              Anchor 1 / 3
            </span>
            <h3 className="mt-1 text-base font-semibold text-slate-100">
              What is your current open-source contribution rhythm?
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Calibrates how steeply the C++ core discounts complex multi-file pull requests.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    experience === opt.id
                      ? "border-primary bg-primary/10 text-slate-100 shadow-md shadow-primary/5"
                      : "border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{opt.title}</span>
                    {experience === opt.id && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Codebase Navigation Comfort */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top">
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
              Anchor 2 / 3
            </span>
            <h3 className="mt-1 text-base font-semibold text-slate-100">
              How do you prefer navigating unfamiliar repositories?
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Tunes difficulty tolerance and weight ($D$) in the 6-factor model.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {NAVIGATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNavigation(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    navigation === opt.id
                      ? "border-primary bg-primary/10 text-slate-100 shadow-md shadow-primary/5"
                      : "border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{opt.title}</span>
                    {navigation === opt.id && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Challenge Goal */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top">
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
              Anchor 3 / 3
            </span>
            <h3 className="mt-1 text-base font-semibold text-slate-100">
              What outcome are you pursuing in your next contribution sprint?
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Balances maintainer responsiveness ($R$) against issue architectural depth.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChallengeGoal(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                    challengeGoal === opt.id
                      ? "border-primary bg-primary/10 text-slate-100 shadow-md shadow-primary/5"
                      : "border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{opt.title}</span>
                    {challengeGoal === opt.id && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep(2)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 active:scale-[0.98]"
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
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top">
            <h3 className="text-base font-semibold text-slate-100">
              Select Languages &amp; Core Frameworks
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              The C++ ranking engine evaluates direct technology matches and cross-ecosystem affinity.
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
                        ? "border-primary bg-primary/15 text-primary font-semibold shadow-sm"
                        : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-slate-200"
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
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Proficiency Level Calibration
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(selectedTechs).map(([tech, score]) => (
                  <div key={tech} className="rounded-lg border border-white/5 bg-slate-950/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-200">{tech}</span>
                      <span className="text-primary font-bold">{score}%</span>
                    </div>
                    <Slider
                      value={[score]}
                      min={10}
                      max={100}
                      step={5}
                      onValueChange={([val]) => setTechScore(tech, val)}
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
              className="border-white/10 text-slate-300"
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={Object.keys(selectedTechs).length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 active:scale-[0.98]"
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
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 specular-top space-y-5">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <ShieldCheck className="size-5" />
              Calibration Complete &amp; Ready to Commit
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <div className="rounded-lg border border-white/5 bg-slate-950/50 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Open Source Experience
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-200 capitalize">
                  {experience.replace("_", " ")}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Navigation Comfort
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-200 capitalize">
                  {navigation}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Sprint Goal
                </span>
                <div className="mt-1 text-sm font-semibold text-slate-200 capitalize">
                  {challengeGoal.replace("_", " ")}
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400">Calibrated Tech Stack:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(selectedTechs).map(([t, s]) => (
                  <span
                    key={t}
                    className="rounded-md border border-white/10 bg-slate-950/60 px-2.5 py-1 font-mono text-xs text-slate-200 flex items-center gap-1.5"
                  >
                    <span>{t}</span>
                    <span className="text-primary font-semibold">{s}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="border-white/10 text-slate-300"
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Modify Stack
            </Button>
            <Button
              onClick={handleFinish}
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 text-sm shadow-lg shadow-primary/20 active:scale-[0.98]"
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
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="first-letter:uppercase text-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
