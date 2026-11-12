import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  RotateCcw,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ErrorState, LoadingState } from "@/components/ip/states";
import { api, type SignalKey } from "@/lib/api";
import { request } from "@/lib/api/http";
import { pageMeta } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/simulator")({
  head: () =>
    pageMeta(
      "What-If Algorithm Simulator",
      "Real-time C++ ranking engine simulation across weight configurations and contributor profiles.",
    ),
  component: SimulatorPage,
});

type Weights = Record<SignalKey, number>;

interface FactorConfig {
  key: SignalKey;
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
    description: "Technology overlap between contributor skills and issue requirements",
  },
  {
    key: "difficulty_match",
    label: "Difficulty Alignment",
    symbol: "D",
    defaultVal: 25,
    description: "Distance between issue architectural complexity and contributor capability",
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
    description: "Implicit taste learned through Like/Dislike votes, acceptances, and completions",
  },
  {
    key: "freshness",
    label: "Issue Freshness",
    symbol: "N",
    defaultVal: 5,
    description: "Recency of original filing and ongoing maintainer activity",
  },
];

const PRESETS: { name: string; weights: Weights; desc: string }[] = [
  {
    name: "Balanced Default",
    weights: {
      skill_match: 35,
      difficulty_match: 25,
      responsiveness: 15,
      repo_health: 10,
      feedback: 10,
      freshness: 5,
    },
    desc: "Standard calibrated baseline for general contributors",
  },
  {
    name: "Beginner Safe",
    weights: {
      skill_match: 15,
      difficulty_match: 45,
      responsiveness: 20,
      repo_health: 10,
      feedback: 5,
      freshness: 5,
    },
    desc: "Heavily weights accessibility, gentle onboarding, and fast maintainers",
  },
  {
    name: "Skill Specialist",
    weights: {
      skill_match: 55,
      difficulty_match: 15,
      responsiveness: 10,
      repo_health: 10,
      feedback: 5,
      freshness: 5,
    },
    desc: "Strict technology match regardless of issue difficulty",
  },
  {
    name: "Active Repos Only",
    weights: {
      skill_match: 20,
      difficulty_match: 15,
      responsiveness: 35,
      repo_health: 20,
      feedback: 5,
      freshness: 5,
    },
    desc: "Guarantees swift turnaround from highly responsive maintainer teams",
  },
];

const PERSONA_META: Record<string, { name: string; title: string }> = {
  "contributor-fullstack": { name: "Alex Rivera", title: "Fullstack Engineer" },
  "contributor-beginner-coldstart": { name: "Jamie Chen", title: "First-Time Contributor" },
  "contributor-systems-cpp": { name: "Marcus Vance", title: "Systems Engineer" },
};

function SimulatorPage() {
  const [weights, setWeights] = useState<Weights>({
    skill_match: 35,
    difficulty_match: 25,
    responsiveness: 15,
    repo_health: 10,
    feedback: 10,
    freshness: 5,
  });

  const [debouncedWeights, setDebouncedWeights] = useState<Weights>(weights);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("my-profile");
  const prevRanksRef = useRef<Record<string, number>>({});
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedWeights(weights);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [weights]);

  // 1. Fetch simulator fixtures & default weights from backend
  const sampleQuery = useQuery({
    queryKey: ["simulator-sample-data"],
    queryFn: () => api.simulator.sampleData(),
    staleTime: 60000,
  });

  // 2. Fetch the signed-in user's real backend profile so they can test their own calibrated skills
  const myRawProfileQuery = useQuery({
    queryKey: ["raw-profile-me"],
    queryFn: () => request<Record<string, any>>("profile.raw", "/api/profile/me"),
    staleTime: 30000,
    retry: false,
  });

  const profileChoices = useMemo(() => {
    const list: { id: string; name: string; title: string; raw: Record<string, any> }[] = [];

    if (myRawProfileQuery.data) {
      const p = myRawProfileQuery.data;
      const username =
        (p["identity"] as Record<string, any>)?.["username"] ||
        (typeof p["user_id"] === "string" ? p["user_id"].replace(/^(github:|local:)/, "") : "You");
      list.push({
        id: "my-profile",
        name: String(username),
        title: "My Calibrated Profile",
        raw: p,
      });
    }

    for (const sp of sampleQuery.data?.profiles ?? []) {
      const uid = String(sp.user_id || "");
      const meta = PERSONA_META[uid];
      list.push({
        id: uid,
        name: meta?.name || uid,
        title: meta?.title || "Sample Persona",
        raw: sp,
      });
    }
    return list;
  }, [myRawProfileQuery.data, sampleQuery.data?.profiles]);

  const activeChoice = useMemo(() => {
    if (profileChoices.length === 0) return null;
    return profileChoices.find((p) => p.id === selectedPersonaId) ?? profileChoices[0] ?? null;
  }, [profileChoices, selectedPersonaId]);

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((a, b) => a + b, 0);
  }, [weights]);

  const normalizedDecimalWeights = useMemo(() => {
    const sum = Object.values(debouncedWeights).reduce((a, b) => a + b, 0);
    const divisor = sum > 0 ? sum : 100;
    return {
      skill_match: debouncedWeights.skill_match / divisor,
      difficulty_match: debouncedWeights.difficulty_match / divisor,
      responsiveness: debouncedWeights.responsiveness / divisor,
      repo_health: debouncedWeights.repo_health / divisor,
      feedback: debouncedWeights.feedback / divisor,
      freshness: debouncedWeights.freshness / divisor,
    };
  }, [debouncedWeights]);

  // 3. Authoritative C++ Engine Ranking Call
  const rankQuery = useQuery({
    queryKey: [
      "simulator-rank",
      activeChoice?.id,
      normalizedDecimalWeights,
      sampleQuery.data?.issues?.length ?? 0,
    ],
    enabled: Boolean(activeChoice && sampleQuery.data?.issues?.length),
    queryFn: async () => {
      const res = await api.simulator.rank({
        profile: activeChoice!.raw,
        weights: normalizedDecimalWeights,
        candidates: sampleQuery.data!.issues,
      });
      return res;
    },
    placeholderData: (prev) => prev,
  });

  const rankedCandidates: any[] = useMemo(() => {
    return Array.isArray(rankQuery.data?.results) ? rankQuery.data.results : [];
  }, [rankQuery.data]);

  // Track rank transitions across C++ engine updates
  useEffect(() => {
    if (rankedCandidates.length === 0) return;
    const currentSnapshot: Record<string, number> = {};
    rankedCandidates.forEach((c, idx) => {
      if (c?.id) currentSnapshot[String(c.id)] = idx + 1;
    });
    if (Object.keys(prevRanksRef.current).length > 0) {
      setPrevRanks({ ...prevRanksRef.current });
    } else {
      setPrevRanks(currentSnapshot);
    }
    prevRanksRef.current = currentSnapshot;
  }, [rankedCandidates]);

  const issueLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const iss of sampleQuery.data?.issues ?? []) {
      if (iss?.id) map.set(String(iss.id), iss);
    }
    return map;
  }, [sampleQuery.data?.issues]);

  const activeSkillsSet = useMemo(() => {
    const set = new Set<string>();
    const skMap = activeChoice?.raw?.["skills"] as Record<string, any> | undefined;
    if (skMap && typeof skMap === "object") {
      for (const k of Object.keys(skMap)) {
        set.add(k.toLowerCase());
      }
    }
    return set;
  }, [activeChoice]);

  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    const factor = 100 / totalWeight;
    const keys: SignalKey[] = [
      "skill_match",
      "difficulty_match",
      "responsiveness",
      "repo_health",
      "feedback",
      "freshness",
    ];
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

  if (sampleQuery.isPending) {
    return <LoadingState rows={4} label="Connecting to C++ ranking simulator" />;
  }

  if (sampleQuery.isError) {
    return <ErrorState error={sampleQuery.error} onRetry={() => sampleQuery.refetch()} />;
  }

  const activeCapability =
    activeChoice?.raw?.["capability"] != null
      ? Math.round(Number(activeChoice.raw["capability"]))
      : "—";

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
                What-If Algorithm Simulator
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Adjust factor weights and watch the native C++ ranking engine re-score candidates in
              real time using the deterministic 6-factor model.
            </p>
          </div>

          {rankQuery.data?.algorithm_version && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-700 shadow-2xs">
              <Cpu className="size-3.5 text-blue-600" />
              <span>Engine: {rankQuery.data.algorithm_version}</span>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 uppercase tracking-wider">
            Presets:
          </span>
          {PRESETS.map((p) => {
            const isMatch = (Object.keys(p.weights) as SignalKey[]).every(
              (k) => weights[k] === p.weights[k],
            );
            return (
              <button
                key={p.name}
                onClick={() => setWeights(p.weights)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer",
                  isMatch
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
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
              if (defaultPreset) setWeights(defaultPreset.weights);
            }}
            className="ml-auto h-7 text-xs text-slate-500 hover:text-slate-900"
          >
            <RotateCcw className="size-3 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Main Grid: Fader Board (Left) & Live C++ Ranked Stream (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Hardware Fader Sliders */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Factor Weights
                </h2>
                <p className="text-xs text-slate-500">Sent live to C++ ranking subprocess</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-xs font-bold",
                    totalWeight === 100
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-amber-300 bg-amber-50 text-amber-700",
                  )}
                >
                  Sum: {totalWeight}%
                </span>
                {totalWeight !== 100 && (
                  <button
                    onClick={normalizeWeights}
                    className="text-[11px] text-blue-600 hover:underline font-mono font-medium cursor-pointer"
                    title="Auto-normalize to sum to 100%"
                  >
                    Normalize
                  </button>
                )}
              </div>
            </div>

            {/* Persona Selector */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Active Contributor Profile</span>
                <span className="font-mono text-blue-700 text-[11px] font-bold">
                  Capability: {activeCapability}/100
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {profileChoices.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={cn(
                      "rounded-lg border p-2 text-left transition-all active:scale-[0.98] cursor-pointer",
                      activeChoice?.id === p.id
                        ? "border-2 border-blue-600 bg-blue-50/60 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
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
                        if (v != null) {
                          setWeights((prev) => ({
                            ...prev,
                            [f.key]: v,
                          }));
                        }
                      }}
                      className="cursor-pointer py-1"
                    />

                    <p className="text-[11px] text-slate-500 leading-tight">{f.description}</p>
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
              C++ Engine Output ({rankedCandidates.length} evaluated)
            </h2>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              {rankQuery.isFetching && <Loader2 className="size-3 animate-spin text-blue-600" />}
              {rankQuery.isFetching ? "Re-ranking in C++…" : "Live C++ engine ranking"}
            </span>
          </div>

          {rankQuery.isError ? (
            <ErrorState error={rankQuery.error} onRetry={() => rankQuery.refetch()} />
          ) : rankQuery.isPending && rankedCandidates.length === 0 ? (
            <LoadingState rows={4} label="Running C++ ranking engine" />
          ) : (
            <div className="space-y-3">
              {rankedCandidates.map((candidate, index) => {
                const cId = String(candidate.id);
                const origIssue = issueLookup.get(cId) || {};
                const sc = candidate.scores || {};
                const ew = candidate.effective_weights || {};

                const currentRank = index + 1;
                const prevRank = prevRanks[cId] ?? currentRank;
                const rankDelta = prevRank - currentRank;

                const techs: string[] = Array.isArray(origIssue.technologies)
                  ? origIssue.technologies
                      .map((t: any) => (typeof t === "string" ? t : t?.technology))
                      .filter(Boolean)
                  : [];

                const repo = candidate.repository_full_name || origIssue.repository_full_name || "";
                const num = candidate.issue_number || origIssue.issue_number || "";
                const issueUrl = candidate.issue_url || origIssue.issue_url || "#";
                const finalScore =
                  typeof sc.final_score === "number" ? Math.round(sc.final_score * 10) / 10 : "—";

                return (
                  <div
                    key={cId}
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
                            <span className="font-mono text-slate-900 font-bold">{repo}</span>
                            {num && <span className="font-mono text-slate-500">#{num}</span>}
                          </div>
                          <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                            {candidate.title || origIssue.title}
                          </h3>
                          {techs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {techs.map((t) => (
                                <span
                                  key={t}
                                  className={cn(
                                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                    activeSkillsSet.has(t.toLowerCase())
                                      ? "border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                                      : "border border-slate-200 bg-slate-50 text-slate-600 font-medium",
                                  )}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Final C++ Engine Score */}
                      <div className="text-right shrink-0">
                        <div className="font-mono text-2xl font-bold text-blue-700 tabular-nums">
                          {finalScore}
                        </div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          C++ Engine Score
                        </div>
                        <a
                          href={issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
                        >
                          Source <ExternalLink className="size-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Component Factor Contributions (with real availability + effective weights) */}
                    <div className="mt-3 grid grid-cols-6 gap-1 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-600 text-center">
                      <div>
                        <div className="text-slate-400 font-medium">
                          S ({Math.round((ew.skill ?? normalizedDecimalWeights.skill_match) * 100)}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.skill_available === false ? "—" : Math.round(sc.skill_match ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">
                          D (
                          {Math.round(
                            (ew.difficulty ?? normalizedDecimalWeights.difficulty_match) * 100,
                          )}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.difficulty_available === false
                            ? "—"
                            : Math.round(sc.difficulty_match ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">
                          R (
                          {Math.round(
                            (ew.responsiveness ?? normalizedDecimalWeights.responsiveness) * 100,
                          )}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.responsiveness_available === false
                            ? "—"
                            : Math.round(sc.responsiveness ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">
                          H ({Math.round((ew.health ?? normalizedDecimalWeights.repo_health) * 100)}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.health_available === false
                            ? "—"
                            : Math.round(sc.repository_health ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">
                          F ({Math.round((ew.feedback ?? normalizedDecimalWeights.feedback) * 100)}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.feedback_available === false ? "—" : Math.round(sc.feedback ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">
                          N (
                          {Math.round((ew.freshness ?? normalizedDecimalWeights.freshness) * 100)}
                          %)
                        </div>
                        <div className="text-slate-900 font-bold">
                          {sc.freshness_available === false ? "—" : Math.round(sc.freshness ?? 0)}
                        </div>
                      </div>
                    </div>

                    {candidate.explanation && (
                      <div className="mt-2.5 text-[11px] font-mono text-slate-500 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100 leading-relaxed">
                        {candidate.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
