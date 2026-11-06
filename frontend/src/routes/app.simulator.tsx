import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  ExternalLink,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { pageMeta } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/simulator")({
  head: () =>
    pageMeta(
      "Recommendation Preferences & Tuning",
      "Calibrate ranking priorities to align recommendations with your goals."
    ),
  component: SimulatorPage,
});

type WeightKey = "skill_match" | "difficulty_match" | "responsiveness" | "repo_health" | "feedback" | "freshness";
type Weights = Record<WeightKey, number>;

interface FactorConfig {
  key: WeightKey;
  label: string;
  symbol: string;
  defaultVal: number;
  description: string;
}

const FACTORS: FactorConfig[] = [
  {
    key: "skill_match",
    label: "Skill Match",
    symbol: "S",
    defaultVal: 35,
    description: "Technology overlap between user demonstrated capability and issue requirements",
  },
  {
    key: "difficulty_match",
    label: "Difficulty Alignment",
    symbol: "D",
    defaultVal: 25,
    description: "Distance between issue architectural complexity and contributor rating",
  },
  {
    key: "responsiveness",
    label: "Maintainer Responsiveness",
    symbol: "R",
    defaultVal: 15,
    description: "Historical median turnaround time for PR reviews and triage actions",
  },
  {
    key: "repo_health",
    label: "Repository Health",
    symbol: "H",
    defaultVal: 10,
    description: "CI pass rates, recent release frequency, and commit consistency",
  },
  {
    key: "feedback",
    label: "Affinity / Feedback",
    symbol: "F",
    defaultVal: 10,
    description: "Implicit contributor taste learned through thumbs up/down and accepted issues",
  },
  {
    key: "freshness",
    label: "Issue Freshness",
    symbol: "N",
    defaultVal: 5,
    description: "Recency of original filing and ongoing maintainer comment activity",
  },
];

interface Persona {
  id: string;
  name: string;
  capability: number;
  title: string;
  skills: string[];
}

const PERSONAS: Persona[] = [
  {
    id: "contributor-fullstack",
    name: "Alex Rivera",
    capability: 76,
    title: "Fullstack Engineer",
    skills: ["Python", "FastAPI", "React", "TypeScript", "MongoDB"],
  },
  {
    id: "contributor-beginner-coldstart",
    name: "Jamie Chen",
    capability: 45,
    title: "First-Time Contributor",
    skills: ["Python", "Documentation", "Git", "Markdown"],
  },
  {
    id: "contributor-systems-cpp",
    name: "Marcus Vance",
    capability: 88,
    title: "Systems Engineer",
    skills: ["C++", "CMake", "Rust", "Linux Kernel", "Low-Level IO"],
  },
];

interface SimulationCandidate {
  id: string;
  repo: string;
  number: number;
  title: string;
  technologies: string[];
  rawScores: Weights;
  url: string;
}

const SAMPLE_CANDIDATES: SimulationCandidate[] = [
  {
    id: "cand-1",
    repo: "tiangolo/fastapi",
    number: 4821,
    title: "Fix MongoDB async connection pooling and reconnect timeouts in backend driver",
    technologies: ["FastAPI", "Python", "MongoDB"],
    rawScores: {
      skill_match: 94,
      difficulty_match: 82,
      responsiveness: 88,
      repo_health: 92,
      feedback: 85,
      freshness: 78,
    },
    url: "https://github.com/tiangolo/fastapi/issues/4821",
  },
  {
    id: "cand-2",
    repo: "facebook/react",
    number: 29810,
    title: "TypeScript typing error for useEffect cleanup return signature in strict mode",
    technologies: ["TypeScript", "React"],
    rawScores: {
      skill_match: 86,
      difficulty_match: 90,
      responsiveness: 92,
      repo_health: 96,
      feedback: 70,
      freshness: 90,
    },
    url: "https://github.com/facebook/react/issues/29810",
  },
  {
    id: "cand-3",
    repo: "llvm/llvm-project",
    number: 84129,
    title: "Add CMake module support for MinGW GCC C++14 abi compatibility",
    technologies: ["C++", "CMake"],
    rawScores: {
      skill_match: 40,
      difficulty_match: 60,
      responsiveness: 80,
      repo_health: 98,
      feedback: 50,
      freshness: 85,
    },
    url: "https://github.com/llvm/llvm-project/issues/84129",
  },
  {
    id: "cand-4",
    repo: "pallets/flask",
    number: 5120,
    title: "Refactor blueprint routing dispatcher to support regex URL parameters",
    technologies: ["Python"],
    rawScores: {
      skill_match: 75,
      difficulty_match: 70,
      responsiveness: 75,
      repo_health: 80,
      feedback: 65,
      freshness: 60,
    },
    url: "https://github.com/pallets/flask/issues/5120",
  },
  {
    id: "cand-5",
    repo: "psf/requests",
    number: 6390,
    title: "Clarify proxy authentication header documentation and SSL adapter examples",
    technologies: ["Python", "Documentation"],
    rawScores: {
      skill_match: 65,
      difficulty_match: 95,
      responsiveness: 88,
      repo_health: 82,
      feedback: 60,
      freshness: 50,
    },
    url: "https://github.com/psf/requests/issues/6390",
  },
];

const PRESETS: { name: string; weights: Weights; desc: string }[] = [
  {
    name: "Balanced Default",
    weights: { skill_match: 35, difficulty_match: 25, responsiveness: 15, repo_health: 10, feedback: 10, freshness: 5 },
    desc: "Standard calibrated baseline for general contributors",
  },
  {
    name: "Beginner Safe",
    weights: { skill_match: 15, difficulty_match: 45, responsiveness: 20, repo_health: 10, feedback: 5, freshness: 5 },
    desc: "Heavily weights accessibility, gentle onboarding, and fast maintainers",
  },
  {
    name: "Skill Specialist",
    weights: { skill_match: 55, difficulty_match: 15, responsiveness: 10, repo_health: 10, feedback: 5, freshness: 5 },
    desc: "Strict technology match regardless of issue difficulty",
  },
  {
    name: "Active Repos Only",
    weights: { skill_match: 20, difficulty_match: 15, responsiveness: 35, repo_health: 20, feedback: 5, freshness: 5 },
    desc: "Guarantees swift turnaround from highly responsive maintainer teams",
  },
];

function SimulatorPage() {
  const [weights, setWeights] = useState<Weights>({
    skill_match: 35,
    difficulty_match: 25,
    responsiveness: 15,
    repo_health: 10,
    feedback: 10,
    freshness: 5,
  });

  const [selectedPersona, setSelectedPersona] = useState<string>("contributor-fullstack");
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((a, b) => a + b, 0);
  }, [weights]);

  const activePersona: Persona = PERSONAS.find((p) => p.id === selectedPersona) ?? PERSONAS[0]!;

  const rankedCandidates = useMemo(() => {
    const list = SAMPLE_CANDIDATES.map((c) => {
      let skillMultiplier = 0.5;
      const matched = c.technologies.filter((t) => activePersona.skills.includes(t));
      if (matched.length > 0) {
        skillMultiplier = 0.8 + (matched.length / c.technologies.length) * 0.2;
      }

      const baseDiff = c.rawScores.difficulty_match;
      const personaDiffBonus = 100 - Math.abs(activePersona.capability - (100 - baseDiff));

      const scores: Weights = {
        skill_match: Math.round(c.rawScores.skill_match * skillMultiplier),
        difficulty_match: Math.max(20, Math.min(100, Math.round(personaDiffBonus))),
        responsiveness: c.rawScores.responsiveness,
        repo_health: c.rawScores.repo_health,
        feedback: c.rawScores.feedback,
        freshness: c.rawScores.freshness,
      };

      const normFactor = totalWeight > 0 ? totalWeight : 1;
      const finalScore = (
        (scores.skill_match * weights.skill_match +
          scores.difficulty_match * weights.difficulty_match +
          scores.responsiveness * weights.responsiveness +
          scores.repo_health * weights.repo_health +
          scores.feedback * weights.feedback +
          scores.freshness * weights.freshness) /
        normFactor
      );

      return {
        ...c,
        computedScores: scores,
        finalScore: Math.round(finalScore * 10) / 10,
      };
    });

    list.sort((a, b) => b.finalScore - a.finalScore);
    return list;
  }, [weights, totalWeight, activePersona]);

  useEffect(() => {
    const newRanks: Record<string, number> = {};
    rankedCandidates.forEach((c, idx) => {
      newRanks[c.id] = idx + 1;
    });
    setPrevRanks((prev) => (Object.keys(prev).length === 0 ? newRanks : prev));
  }, [rankedCandidates]);

  const updateWeight = (key: WeightKey, val: number) => {
    const snapshot: Record<string, number> = {};
    rankedCandidates.forEach((c, idx) => {
      snapshot[c.id] = idx + 1;
    });
    setPrevRanks(snapshot);

    setWeights((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const applyPreset = (presetWeights: Weights) => {
    const snapshot: Record<string, number> = {};
    rankedCandidates.forEach((c, idx) => {
      snapshot[c.id] = idx + 1;
    });
    setPrevRanks(snapshot);
    setWeights(presetWeights);
  };

  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    const factor = 100 / totalWeight;
    const keys: WeightKey[] = ["skill_match", "difficulty_match", "responsiveness", "repo_health", "feedback", "freshness"];
    const normalized: Partial<Weights> = {};
    let sum = 0;
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        normalized[k] = 100 - sum;
      } else {
        const v = Math.round(weights[k] * factor);
        normalized[k] = v;
        sum += v;
      }
    });
    setWeights(normalized as Weights);
  };

  return (
    <div className="space-y-8">
      {/* Surface Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <SlidersHorizontal className="size-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Recommendation Preferences
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Fine-tune matching priorities to align recommendations with your goals. The candidate pool dynamically updates in real time.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 uppercase tracking-wider">Presets:</span>
          {PRESETS.map((p) => {
            const isMatch = (Object.keys(p.weights) as WeightKey[]).every((k) => weights[k] === p.weights[k]);
            return (
              <button
                key={p.name}
                onClick={() => applyPreset(p.weights)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-[0.98]",
                  isMatch
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
                title={p.desc}
              >
                {p.name}
              </button>
            );
          })}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const defaultPreset = PRESETS[0];
              if (defaultPreset) applyPreset(defaultPreset.weights);
            }}
            className="ml-auto h-7 text-xs text-slate-500 hover:text-slate-900"
          >
            <RotateCcw className="size-3 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Main Grid: Fader Board (Left) & Live Ranked Stream (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Hardware Fader Sliders */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Matching Preferences
                </h2>
                <p className="text-xs text-slate-500">Relative influence on ranking order</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-xs font-bold",
                    totalWeight === 100
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-amber-300 bg-amber-50 text-amber-700"
                  )}
                >
                  Sum: {totalWeight}%
                </span>
                {totalWeight !== 100 && (
                  <button
                    onClick={normalizeWeights}
                    className="text-[11px] text-blue-600 hover:underline font-mono font-medium"
                    title="Auto-normalize to sum to 100%"
                  >
                    Normalize
                  </button>
                )}
              </div>
            </div>

            {/* Persona Selector inside Fader Board */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Active Contributor Persona</span>
                <span className="font-mono text-blue-700 text-[11px] font-bold">
                  Capability: {activePersona.capability}/100
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersona(p.id)}
                    className={cn(
                      "rounded-lg border p-2 text-left transition-all active:scale-[0.98]",
                      selectedPersona === p.id
                        ? "border-2 border-blue-600 bg-blue-50/60 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="text-xs font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{p.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Hardware Faders */}
            <div className="mt-5 space-y-4">
              {FACTORS.map((f) => {
                const val = weights[f.key];
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded font-mono text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-800">
                          {f.symbol}
                        </span>
                        <span className="font-semibold text-slate-900">{f.label}</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                        {val}%
                      </span>
                    </div>

                    <Slider
                      value={[val]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => {
                        if (v != null) updateWeight(f.key, v);
                      }}
                      className="cursor-pointer py-1"
                    />

                    <p className="text-[11px] text-slate-500 leading-tight">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Ranked Output Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              Dynamic Candidate Ranking ({rankedCandidates.length} evaluated)
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Sorted by recomputed match score
            </span>
          </div>

          <div className="space-y-3">
            {rankedCandidates.map((candidate, index) => {
              const currentRank = index + 1;
              const prevRank = prevRanks[candidate.id] ?? currentRank;
              const rankDelta = prevRank - currentRank;

              return (
                <div
                  key={candidate.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Rank Badge with movement indicator */}
                      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 min-w-12 text-center">
                        <span className="font-mono text-base font-bold text-slate-900">
                          #{currentRank}
                        </span>
                        {rankDelta > 0 ? (
                          <span className="flex items-center text-[10px] font-mono font-bold text-emerald-700">
                            <ArrowUpRight className="size-3" />+{rankDelta}
                          </span>
                        ) : rankDelta < 0 ? (
                          <span className="flex items-center text-[10px] font-mono font-bold text-rose-700">
                            <ArrowDownRight className="size-3" />
                            {rankDelta}
                          </span>
                        ) : (
                          <span className="flex items-center text-[10px] font-mono text-slate-400">
                            <Minus className="size-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Issue Details */}
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono text-slate-900 font-bold">{candidate.repo}</span>
                          <span className="font-mono text-slate-500">#{candidate.number}</span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                          {candidate.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {candidate.technologies.map((t) => (
                            <span
                              key={t}
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                activePersona.skills.includes(t)
                                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                                  : "border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                              )}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Final Recomputed Score */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-2xl font-bold text-blue-700 tabular-nums">
                        {candidate.finalScore}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Re-Ranked Score
                      </div>
                      <a
                        href={candidate.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
                      >
                        Source <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Component Factor Contribution Bar */}
                  <div className="mt-3 grid grid-cols-6 gap-1 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-600 text-center">
                    <div>
                      <div className="text-slate-400 font-medium">S ({weights.skill_match}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.skill_match}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">D ({weights.difficulty_match}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.difficulty_match}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">R ({weights.responsiveness}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.responsiveness}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">H ({weights.repo_health}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.repo_health}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">F ({weights.feedback}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.feedback}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">N ({weights.freshness}%)</div>
                      <div className="text-slate-900 font-bold">{candidate.computedScores.freshness}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}