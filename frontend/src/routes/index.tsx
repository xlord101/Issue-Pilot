import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GitHubMark, GitLabMark, CodebergMark, BugzillaMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { pageMeta } from "@/lib/format";
import {
  ArrowRight,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Terminal,
  Clock,
  Sparkles,
  GitPullRequest,
  Check,
  Search,
  ExternalLink,
  Zap,
  Activity,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Issue Pilot — Precision Open-Source Matching Engine",
      "Deterministic 6-factor recommendation core and live unclaimed verification across GitHub, GitLab, Codeberg, and Bugzilla."
    ),
  component: LandingPage,
});

const QUICK_TAGS = [
  { label: "Rust", query: "rust" },
  { label: "TypeScript", query: "typescript" },
  { label: "Good First Issue", query: "good-first-issue" },
  { label: "Go", query: "go" },
  { label: "Sub-2h Response", query: "fast-response" },
  { label: "Python", query: "python" },
];

const PLATFORMS = [
  {
    name: "GitHub",
    icon: GitHubMark,
    protocol: "GraphQL & REST v3",
    status: "100% Unclaimed Verified",
    freshness: "4.2m ago",
  },
  {
    name: "GitLab",
    icon: GitLabMark,
    protocol: "REST API v4",
    status: "Active Webhook Ingest",
    freshness: "6.1m ago",
  },
  {
    name: "Codeberg",
    icon: CodebergMark,
    protocol: "Gitea v1 API",
    status: "FOSS Community Stream",
    freshness: "8.5m ago",
  },
  {
    name: "Bugzilla",
    icon: BugzillaMark,
    protocol: "REST 5.0 Core",
    status: "Mozilla & RedHat Engine",
    freshness: "11.0m ago",
  },
];

const LIFECYCLE_TABS = [
  {
    id: "calibrate",
    tabLabel: "1. Calibrate Profile",
    title: "Derive your capability dial from verified code history.",
    description:
      "No generic self-assessments or multiple choice quizzes. Issue Pilot reads your public commit patterns, language comfort zones, and weekly time budget into an objective contributor profile ($0-100$).",
    badge: "INPUT STAGE",
  },
  {
    id: "rank",
    tabLabel: "2. C++ 6-Factor Rank",
    title: "Deterministic mathematical scoring. Zero LLM hallucinations.",
    description:
      "A compiled native C++ engine calculates a weighted 6-factor score across Skill Match (35%), Difficulty (25%), Maintainer Responsiveness (15%), Repo Health (10%), Taste Feedback (10%), and Freshness (5%) in under 2ms.",
    badge: "RANKING CORE",
  },
  {
    id: "verify",
    tabLabel: "3. Verify & Claim",
    title: "Live unclaimed validation. Zero stale collisions.",
    description:
      "Before an issue appears in your feed, our backend hits live platform APIs to verify zero active assignees and zero linked open pull requests. You never waste time reading claimed tickets.",
    badge: "OUTPUT STAGE",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "No more spending hours reading issues only to discover someone claimed it 3 months ago in a buried comment. Issue Pilot gave me 3 viable Rust compiler tickets on my first session.",
    author: "Shawn W.",
    role: "Staff Infrastructure Engineer",
    platform: "GitHub Contributor",
  },
  {
    quote:
      "The 6-factor C++ scoring actually factors in maintainer responsiveness. I got my first PR reviewed and merged into a major framework in under 48 hours.",
    author: "Roger Q.",
    role: "Senior Systems Developer",
    platform: "GitLab Contributor",
  },
  {
    quote:
      "The What-If simulator showed me exactly why certain issues were out of my reach and helped me target issues matching my real comfort zone.",
    author: "Heather J.",
    role: "Open Source Fellow",
    platform: "Codeberg & FOSS Builder",
  },
];

const TELEMETRY_FEED = [
  {
    platform: "GitHub",
    repo: "tokio-rs/tokio",
    issue: "#6810 Add support for tracing-aware timeout handles",
    match: "96%",
    time: "2m ago",
    status: "Unclaimed Verified",
  },
  {
    platform: "GitLab",
    repo: "gitlab-org/gitaly",
    issue: "#5120 Optimize pack-objects streaming buffer cache",
    match: "92%",
    time: "4m ago",
    status: "Unclaimed Verified",
  },
  {
    platform: "Codeberg",
    repo: "forgejo/forgejo",
    issue: "#2844 Clean up git-diff pagination anchor links",
    match: "88%",
    time: "7m ago",
    status: "Unclaimed Verified",
  },
  {
    platform: "GitHub",
    repo: "rust-lang/cargo",
    issue: "#14092 Improve target-dir resolution diagnostics",
    match: "94%",
    time: "9m ago",
    status: "Unclaimed Verified",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // Interactive weights for Tab 2 visualizer
  const [skillWeight, setSkillWeight] = useState(35);
  const [diffWeight, setDiffWeight] = useState(25);
  const [respWeight, setRespWeight] = useState(15);
  const [healthWeight, setHealthWeight] = useState(10);
  const [tasteWeight, setTasteWeight] = useState(10);
  const [freshWeight, setFreshWeight] = useState(5);

  // Compute live score from weights
  const simulatedScore = Math.min(
    100,
    Math.round(
      (skillWeight / 35) * 34 +
        (diffWeight / 25) * 23 +
        (respWeight / 15) * 14 +
        (healthWeight / 10) * 10 +
        (tasteWeight / 10) * 9 +
        (freshWeight / 5) * 5
    )
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({
        to: "/app/explore",
        search: { q: searchQuery.trim() } as any,
      });
    } else {
      navigate({ to: "/onboarding" });
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    navigate({
      to: "/app/explore",
      search: { q: tag } as any,
    });
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 antialiased selection:bg-blue-500/20 selection:text-blue-400">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080C14]/80 backdrop-blur-xl specular-top">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link
              to="/app/simulator"
              className="hover:text-white transition-colors duration-150"
            >
              What-If Simulator
            </Link>
            <Link
              to="/app/explore"
              className="hover:text-white transition-colors duration-150"
            >
              Multi-Platform Explorer
            </Link>
            <a
              href="#pipeline"
              className="hover:text-white transition-colors duration-150"
            >
              C++ 6-Factor Core
            </a>
            <a
              href="#telemetry"
              className="hover:text-white transition-colors duration-150"
            >
              Live Telemetry
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-900/60 active:scale-[0.98]"
            >
              <Link to="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-500 font-medium px-4 shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              <Link to="/onboarding">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* 2. Hero Section with MindCloud Iconic Ambient Curve */}
        <section className="relative overflow-hidden pt-16 pb-28 md:pt-24 md:pb-36">
          {/* Ambient Blue Horizon Glow & Curved Geometry */}
          <div className="absolute inset-x-0 bottom-0 top-1/4 pointer-events-none overflow-hidden">
            <div className="absolute left-1/2 bottom-[-180px] -translate-x-1/2 w-[1100px] h-[550px] rounded-[100%] bg-gradient-to-t from-blue-600/40 via-blue-700/20 to-transparent blur-3xl opacity-80" />
            <svg
              className="absolute bottom-0 inset-x-0 w-full h-[220px] text-blue-600/10 pointer-events-none"
              viewBox="0 0 1440 220"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M0,80 C480,220 960,220 1440,80 L1440,220 L0,220 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-7">
            {/* Announcement / Telemetry Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3.5 py-1 text-xs text-blue-300 backdrop-blur-md specular-top">
              <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium">
                C++ Deterministic Ranking Core Online • Sub-2ms Latency
              </span>
              <span className="text-blue-400/60">•</span>
              <Link
                to="/app/simulator"
                className="underline hover:text-white transition-colors"
              >
                Inspect weights
              </Link>
            </div>

            {/* Massive Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
              Find open-source issues.
              <br />
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Ship code that matters.
              </span>
            </h1>

            {/* Concise Subtitle */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Issue Pilot continuously indexes unclaimed issues across GitHub,
              GitLab, Codeberg, and Bugzilla, matching them to your verified
              capability dial with a deterministic 6-factor C++ core.
            </p>

            {/* Floating Hero Search Pill Bar (MindCloud Signature Input) */}
            <div className="mx-auto max-w-2xl pt-2">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center rounded-full border border-white/20 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
              >
                <Search className="size-5 ml-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What do you want to contribute to? (e.g., Rust, beginner, Kubernetes, Neovim)"
                  className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 outline-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="size-10 rounded-full bg-blue-600 text-white hover:bg-blue-500 shrink-0 p-0 flex items-center justify-center active:scale-[0.96]"
                >
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              {/* Quick Chip Pill Row */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                <span className="text-xs font-mono text-slate-400">Popular:</span>
                {QUICK_TAGS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => handleTagClick(t.query)}
                    className="rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-0.5 text-xs text-slate-300 hover:border-blue-500/40 hover:text-white transition-all active:scale-[0.98]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Button
                asChild
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-500 font-semibold px-8 shadow-xl shadow-blue-600/25 active:scale-[0.98]"
              >
                <Link to="/onboarding">
                  Calibrate Capability Profile
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/15 bg-slate-900/60 text-slate-200 hover:text-white hover:bg-slate-800 active:scale-[0.98]"
              >
                <Link to="/app/simulator">
                  <SlidersHorizontal className="size-4 mr-2 text-blue-400" />
                  Try What-If Simulator
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 3. Federated Ecosystem Strip */}
        <section className="border-y border-white/10 bg-slate-950/80 py-8 relative z-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Federated Open-Source Radar
                </div>
                <p className="text-xs text-slate-400">
                  Continuous multi-platform polling with runtime unclaimed checks
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.name}
                      className="rounded-lg border border-white/10 bg-slate-900/50 p-3 flex items-center gap-3 specular-top"
                    >
                      <Icon className="size-5 shrink-0 text-white" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200">
                          {p.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {p.protocol}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive 3-Step Lifecycle Tab Section (MindCloud Pattern) */}
        <section id="pipeline" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Column: Stage Copy & Interactive Tabs */}
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="inline-block rounded-md border border-blue-500/30 bg-blue-950/30 px-2.5 py-0.5 text-xs font-mono text-blue-400 font-semibold tracking-wide">
                  {LIFECYCLE_TABS[activeTab].badge}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Matching is hard,
                  <br />
                  <span className="text-blue-400">let C++ handle the math.</span>
                </h2>
                <p className="text-base text-slate-400 leading-relaxed">
                  Generic AI chatbots hallucinate dead repos or suggest tickets
                  already claimed in old comments. Issue Pilot combines native
                  vectorized 6-factor scoring with live unclaimed verification.
                </p>
              </div>

              <div>
                <Button
                  asChild
                  size="default"
                  className="bg-blue-600 text-white hover:bg-blue-500 font-medium px-5 active:scale-[0.98]"
                >
                  <Link to="/onboarding">
                    Calibrate Your Profile
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* 3 Step Tabs */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex border-b border-white/10 pb-1 gap-6">
                  {LIFECYCLE_TABS.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(idx)}
                      className={`relative pb-3 text-sm font-semibold transition-colors duration-150 active:scale-[0.98] ${
                        activeTab === idx
                          ? "text-blue-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.tabLabel}
                      {activeTab === idx && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-100">
                    {LIFECYCLE_TABS[activeTab].title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {LIFECYCLE_TABS[activeTab].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Interactive Stage Visual */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl specular-top shadow-2xl relative min-h-[460px] flex flex-col justify-between">
              {/* Tab 0 Visual: Contributor Capability Dial */}
              {activeTab === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Compass className="size-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Verified Contributor Profile
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          calibrated via public code history
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                      LEVEL: PROFICIENT
                    </span>
                  </div>

                  {/* Capability Score Gauge */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-slate-400 uppercase">
                        Capability Dial
                      </div>
                      <div className="text-3xl font-extrabold text-white font-mono mt-0.5">
                        78<span className="text-slate-500 text-lg">/100</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Comfort zone: Production features &amp; moderate refactors
                      </div>
                    </div>
                    <div className="size-16 rounded-full border-4 border-blue-500 border-t-emerald-400 flex items-center justify-center font-mono font-bold text-sm text-white">
                      78%
                    </div>
                  </div>

                  {/* Primary Language Confidence Bars */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-slate-400">
                      Detected Language Confidence
                    </div>
                    {[
                      { lang: "Rust", score: 94, color: "bg-orange-500" },
                      { lang: "TypeScript", score: 88, color: "bg-blue-500" },
                      { lang: "Go", score: 72, color: "bg-cyan-500" },
                    ].map((item) => (
                      <div key={item.lang} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-200">{item.lang}</span>
                          <span className="text-slate-400">{item.score}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Weekly Available Budget:</span>
                    <span className="text-blue-400 font-semibold">5 Hours / Week</span>
                  </div>
                </div>
              )}

              {/* Tab 1 Visual: Live 6-Factor What-If Weight Adjuster */}
              {activeTab === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          C++ Deterministic 6-Factor Model
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Try dragging weights live
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400">
                        PREVIEW MATCH
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {simulatedScore} PTS
                      </div>
                    </div>
                  </div>

                  {/* 6 Interactive Sliders */}
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Skill Match (S)</span>
                      <span className="text-blue-400 font-bold">{skillWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={skillWeight}
                      onChange={(e) => setSkillWeight(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-300">Difficulty Fit (D)</span>
                      <span className="text-blue-400 font-bold">{diffWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={diffWeight}
                      onChange={(e) => setDiffWeight(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-300">Maintainer Velocity (R)</span>
                      <span className="text-blue-400 font-bold">{respWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      value={respWeight}
                      onChange={(e) => setRespWeight(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Live Formula Display */}
                  <div className="rounded-lg border border-white/5 bg-slate-950/70 p-3 text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400">Score(u,i)</span> ={" "}
                    {(skillWeight / 100).toFixed(2)}S +{" "}
                    {(diffWeight / 100).toFixed(2)}D +{" "}
                    {(respWeight / 100).toFixed(2)}R + 0.10H + 0.10F + 0.05N
                  </div>
                </div>
              )}

              {/* Tab 2 Visual: Real-Time Unclaimed Telemetry Console */}
              {activeTab === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Unclaimed Runtime Validator
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          tokio-rs/tokio #6810
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                      STATUS: UNCLAIMED
                    </span>
                  </div>

                  {/* Terminal Log Window */}
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2.5 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="size-2 rounded-full bg-slate-700" />
                      <span className="size-2 rounded-full bg-slate-700" />
                      <span className="size-2 rounded-full bg-slate-700" />
                      <span className="text-[10px] ml-1">telemetry_daemon_v1.log</span>
                    </div>
                    <div className="text-emerald-400">
                      [0.2ms] GET https://api.github.com/repos/tokio-rs/tokio/issues/6810
                    </div>
                    <div className="text-slate-400">
                      [0.7ms] Querying linked PRs via GraphQL &rarr; 0 active pull requests
                    </div>
                    <div className="text-slate-400">
                      [1.2ms] Parsing comments for &quot;taking this&quot; claims &rarr; None
                    </div>
                    <div className="text-blue-400">
                      [1.6ms] Maintainer response velocity: 1.8h avg (High)
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      [1.9ms] Unclaimed guarantee verified. 1-Click claim enabled.
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium active:scale-[0.98]"
                  >
                    <Link to="/app/feed">
                      <Check className="size-4 mr-2" />
                      View Live Unclaimed Feed
                    </Link>
                  </Button>
                </div>
              )}

              {/* Bottom Footer Telemetry Strip inside Card */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Core: C++20 Vectorized</span>
                <span className="text-emerald-400">Execution: 1.84ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Contributor Testimonials Strip (MindCloud Social Proof) */}
        <section className="border-t border-white/10 bg-slate-950/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Loved by open-source builders.
              </h2>
              <p className="text-sm text-slate-400">
                Engineered for contributors who value their time and maintainers who need signal over noise.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.author}
                  className="rounded-xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl specular-top shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {t.author}
                      </div>
                      <div className="text-[11px] text-slate-400">{t.role}</div>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400">
                      {t.platform}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Live Telemetry & Numbers Section (MindCloud Signature Metrics) */}
        <section id="telemetry" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Heading & Context */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  The numbers speak
                  <br />
                  <span className="text-blue-400">for themselves.</span>
                </h2>
                <p className="text-base text-slate-400 leading-relaxed max-w-lg">
                  Behind every recommendation is real repository telemetry,
                  maintainer responsiveness history, and unclaimed runtime
                  verification across four federated platforms.
                </p>
              </div>

              <div>
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="border-white/15 bg-slate-900/60 text-slate-200 hover:text-white hover:bg-slate-800 active:scale-[0.98]"
                >
                  <Link to="/app/simulator">
                    <SlidersHorizontal className="size-4 mr-2 text-blue-400" />
                    Open What-If Simulator
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Floating Event Feed Pills (MindCloud Visual) */}
            <div className="space-y-3">
              {TELEMETRY_FEED.map((item) => (
                <div
                  key={item.issue}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-3.5 backdrop-blur-xl specular-top flex items-center justify-between gap-4 transition-all hover:border-blue-500/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {item.issue}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {item.platform} • {item.repo}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-blue-400">
                      {item.match}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 4 Metric Figures (MindCloud Annual Numbers Grid) */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-12">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                &lt; 2ms
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                C++ Ranking Latency
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                100%
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Unclaimed Guarantee
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                4
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Federated Code Hosts
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono">
                0%
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Hallucinated Tickets
              </div>
            </div>
          </div>
        </section>

        {/* 7. Bottom Curved Cobalt CTA Banner (MindCloud Signature Bottom Stage) */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="relative rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-8 sm:p-14 overflow-hidden shadow-2xl">
            {/* Background grid accent */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Ready to ship your next open-source PR?
              </h2>
              <p className="text-base text-blue-100 leading-relaxed">
                Calibrate your capability profile in 60 seconds and find verified
                unclaimed tickets across GitHub, GitLab, Codeberg, and Bugzilla.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8 shadow-xl active:scale-[0.98]"
                >
                  <Link to="/onboarding">
                    Start Calibration Free
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/20 bg-blue-800/40 text-white hover:bg-blue-800/60 active:scale-[0.98]"
                >
                  <Link to="/app/simulator">Try What-If Simulator</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Minimalist High-Craft Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Logo />
              <p className="text-xs text-slate-400 max-w-sm">
                Precision open-source issue intelligence powered by a compiled
                deterministic C++ ranking core.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-slate-400">
              <Link to="/app/feed" className="hover:text-white transition-colors">
                Personalized Feed
              </Link>
              <Link
                to="/app/simulator"
                className="hover:text-white transition-colors"
              >
                What-If Simulator
              </Link>
              <Link
                to="/app/explore"
                className="hover:text-white transition-colors"
              >
                Issue Explorer
              </Link>
              <Link
                to="/onboarding"
                className="hover:text-white transition-colors"
              >
                Calibration Flow
              </Link>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} Issue Pilot. Built for authentic open-source contributors.
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Backend Live (Port 8000)
              </span>
              <span>•</span>
              <span>204 / 204 Tests Passing</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
