import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GitHubMark, GitLabMark, CodebergMark, BugzillaMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { AuroraBackground } from "@/components/ip/aurora-background";
import { pageMeta } from "@/lib/format";
import {
  ArrowRight,
  Cpu,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Terminal,
  Check,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Issue Pilot — Precision Open-Source Matching Engine",
      "Intelligent recommendation engine and live unclaimed verification across GitHub, GitLab, Codeberg, and Bugzilla."
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
  },
  {
    name: "GitLab",
    icon: GitLabMark,
    protocol: "REST API v4",
    status: "Active Webhook Ingest",
  },
  {
    name: "Codeberg",
    icon: CodebergMark,
    protocol: "Gitea v1 API",
    status: "FOSS Community Stream",
  },
  {
    name: "Bugzilla",
    icon: BugzillaMark,
    protocol: "REST 5.0 Core",
    status: "Mozilla & RedHat Engine",
  },
];

const LIFECYCLE_TABS = [
  {
    id: "calibrate",
    stepNumber: "01",
    tabLabel: "Profile Calibration",
    title: "Derive your capability target from verified code history.",
    description:
      "Most contributor matching fails because of self-reported surveys. Issue Pilot analyzes your public pull requests, commits, and language comfort zones into an objective capability score (0–100).",
    badge: "CALIBRATION",
  },
  {
    id: "match",
    stepNumber: "02",
    tabLabel: "Precision Matching",
    title: "Multi-signal scoring matched to your stack and experience.",
    description:
      "Every candidate is scored across language overlap, difficulty fit, maintainer response speed, and repository health in real time.",
    badge: "MATCHING",
  },
  {
    id: "verify",
    stepNumber: "03",
    tabLabel: "Zero-Collision Guarantee",
    title: "Live unclaimed validation. Never work on taken tasks.",
    description:
      "Before an issue appears in your feed, our backend queries live platform APIs to verify zero active assignees and zero open pull requests.",
    badge: "VERIFICATION",
  },
];


const TELEMETRY_FEED = [
  {
    action: "142 unclaimed issues verified",
    time: "2m ago",
    active: true,
  },
  {
    action: "rust-lang/cargo #14092 matched at 96%",
    time: "1m ago",
    active: true,
  },
  {
    action: "neovim/neovim maintainer ping: 1.4h avg",
    time: "Just now",
    active: true,
  },
  {
    action: "GitLab v4 candidate parsed: 0 assignees",
    time: "3m ago",
    active: false,
  },
  {
    action: "Codeberg gitea webhook: 18 new candidates",
    time: "4m ago",
    active: false,
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

  const simulatedScore = Math.min(
    100,
    Math.round(
      (skillWeight / 35) * 34 +
        (diffWeight / 25) * 23 +
        (respWeight / 15) * 14 +
        24
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
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. HERO SECTION (Animated 3-Color Pastel Aura Mesh Background) */}
      <AuroraBackground
        intensity="vibrant"
        className="text-slate-900"
      >
        {/* Navigation Bar inside Hero Header */}
        <header className="border-b border-slate-200/70 relative z-30">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-slate-900">
                <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                  <div className="size-3.5 rounded-sm bg-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  issue pilot
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 font-medium">
                <Link
                  to="/app/simulator"
                  className="hover:text-slate-900 transition-colors"
                >
                  Preferences
                </Link>
                <Link
                  to="/app/explore"
                  className="hover:text-slate-900 transition-colors"
                >
                  Issue Explorer
                </Link>
                <a
                  href="#pipeline"
                  className="hover:text-slate-900 transition-colors"
                >
                  Architecture
                </a>
                <a
                  href="#numbers"
                  className="hover:text-slate-900 transition-colors"
                >
                  Coverage
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-700 hover:text-slate-900 hover:bg-slate-200/50 active:scale-[0.98]"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-4 shadow-sm shadow-blue-600/20 active:scale-[0.98]"
              >
                <Link to="/onboarding">Get started</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-28 sm:pt-24 sm:pb-36 text-center relative z-20 space-y-6">
          {/* Top tag pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-3.5 py-1 text-xs text-slate-700 backdrop-blur-md shadow-xs">
            <span className="font-semibold text-slate-900">Continuous Match Engine</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Live unclaimed verification</span>
            <Link
              to="/app/explore"
              className="ml-1 text-blue-600 underline hover:text-blue-700 font-medium"
            >
              Explore issues &rarr;
            </Link>
          </div>

          {/* Huge Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
            Find open-source issues.
            <br />
            <span className="text-slate-900">Ship code that matters.</span>
          </h1>

          {/* Clean Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Issue Pilot continuously indexes unclaimed issues across GitHub,
            GitLab, Codeberg, and Bugzilla, matching them to your verified
            stack proficiency and capability target.
          </p>

          {/* MindCloud Exact White Floating CTA Prompt Bar */}
          <div className="mx-auto max-w-2xl pt-4">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center rounded-2xl bg-white p-2 shadow-xl shadow-slate-200/60 transition-all focus-within:ring-4 focus-within:ring-blue-500/20 border border-slate-200/80"
            >
              <Search className="size-5 ml-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Start right now. What should we match? (e.g., Rust, beginner, Kubernetes)"
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              <Button
                type="submit"
                size="sm"
                className="size-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shrink-0 p-0 flex items-center justify-center shadow-md shadow-blue-600/30 active:scale-[0.96]"
              >
                <ArrowRight className="size-5" />
              </Button>
            </form>

            {/* Quick chips below prompt */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              <span className="text-xs text-slate-500 font-medium">Popular:</span>
              {QUICK_TAGS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTagClick(t.query)}
                  className="rounded-full bg-white/80 hover:bg-white border border-slate-200/80 hover:border-slate-300 px-2.5 py-0.5 text-xs text-slate-700 hover:text-slate-900 shadow-2xs transition-all active:scale-[0.98]"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AuroraBackground>

      {/* 2. LOGO / ECOSYSTEM STRIP (Pure White Background) */}
      <section className="bg-white py-12 border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 mb-8">
            Continuously indexed &amp; verified across modern open source
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-center">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
                >
                  <Icon className="size-6 text-slate-800 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {p.protocol}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. STEP-SWITCHER (Interactive Pipeline Showcase) */}
      <section id="pipeline" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Engineered Dark Stage Container */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#0c101d] via-[#090d16] to-[#070a12] p-8 sm:p-14 text-white shadow-2xl overflow-hidden border border-slate-800/80 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-blue-600/10 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-indigo-600/10 blur-[120px]" />

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center relative z-10">
              {/* Left Column: Heading, 3 Interactive Step Cards, and CTA */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-mono font-semibold text-blue-400">
                    THE DISCOVERY PIPELINE
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    From repository discovery
                    <br />
                    <span className="text-blue-400">to your first merged PR.</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
                    Three automated stages that eliminate stale tickets, unmatched skill curves,
                    and unresponsive maintainers across GitHub, GitLab, Codeberg, and Bugzilla.
                  </p>
                </div>

                {/* 3 Interactive Vertical Step Cards */}
                <div className="space-y-3 pt-2">
                  {LIFECYCLE_TABS.map((tab, idx) => {
                    const isActive = activeTab === idx;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(idx)}
                        className={cn(
                          "w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] border",
                          isActive
                            ? "border-blue-500/50 bg-slate-800/70 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "border-slate-800/80 bg-slate-900/30 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "text-xs font-mono font-bold px-2 py-0.5 rounded-md",
                                isActive
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-slate-800 text-slate-500 border border-slate-700/50"
                              )}
                            >
                              {tab.stepNumber}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold tracking-tight",
                                isActive ? "text-white" : "text-slate-300"
                              )}
                            >
                              {tab.tabLabel}
                            </span>
                          </div>
                          {isActive && (
                            <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
                          )}
                        </div>
                        {isActive && (
                          <p className="text-xs text-slate-400 leading-relaxed mt-2.5 pl-9">
                            {tab.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Primary CTA Button */}
                <div className="pt-2">
                  <Button
                    asChild
                    size="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-md shadow-blue-600/25 active:scale-[0.98]"
                  >
                    <Link to="/onboarding">
                      Calibrate your profile &rarr;
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Visual Stage (Elevated Glass Card) */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-2xl relative min-h-[440px] flex flex-col justify-between">
                {/* Tab 0 Visual: Profile & Dial */}
                {activeTab === 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Compass className="size-5 text-blue-400" />
                        <span className="text-sm font-semibold text-slate-200">
                          Contributor Capability Dial
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VERIFIED: 78/100
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono text-slate-400">
                          Primary Focus Area
                        </div>
                        <div className="text-xl font-bold text-white mt-1">
                          Systems &amp; Backends
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Target difficulty: 65 – 85 pts (Optimal growth zone)
                        </div>
                      </div>
                      <div className="size-14 rounded-full border-4 border-blue-500 border-t-emerald-400 flex items-center justify-center font-mono font-bold text-sm text-white bg-slate-900 shadow-inner">
                        78%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono text-slate-400">
                        Language Confidence Breakdown
                      </div>
                      {[
                        { lang: "Rust", score: 94, bar: "w-[94%] bg-blue-500" },
                        { lang: "TypeScript", score: 88, bar: "w-[88%] bg-sky-400" },
                        { lang: "Go", score: 72, bar: "w-[72%] bg-indigo-400" },
                      ].map((item) => (
                        <div key={item.lang} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-300">{item.lang}</span>
                            <span className="text-slate-400">{item.score}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${item.bar}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 1 Visual: Dynamic Weights Tuning */}
                {activeTab === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-5 text-blue-400" />
                        <span className="text-sm font-semibold text-slate-200">
                          Personalized Priority Weights
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs text-slate-400 mr-2">Simulated Match:</span>
                        <span className="text-base font-bold text-emerald-400">
                          {simulatedScore}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-300">Skill Alignment:</span>
                          <span className="text-blue-400 font-bold">{skillWeight}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          value={skillWeight}
                          onChange={(e) => setSkillWeight(Number(e.target.value))}
                          className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-300">Difficulty Stretch:</span>
                          <span className="text-blue-400 font-bold">{diffWeight}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          value={diffWeight}
                          onChange={(e) => setDiffWeight(Number(e.target.value))}
                          className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-300">Maintainer Velocity:</span>
                          <span className="text-blue-400 font-bold">{respWeight}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="40"
                          value={respWeight}
                          onChange={(e) => setRespWeight(Number(e.target.value))}
                          className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-400">Matched Candidate</span>
                        <span className="font-mono text-emerald-400 font-semibold">{simulatedScore} Match</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200">tokio-rs/tokio #6810</div>
                      <div className="text-xs text-slate-400">Support graceful task cancellation during runtime shutdown</div>
                    </div>
                  </div>
                )}

                {/* Tab 2 Visual: Live Zero-Collision Runtime Validator */}
                {activeTab === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="size-5 text-blue-400" />
                        <span className="text-sm font-semibold text-slate-200">
                          Unclaimed Runtime Validator
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                        100% UNCLAIMED
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-mono text-xs text-slate-300 space-y-2.5">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Source verification: Open issue confirmed</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Zero assignees: Unclaimed &amp; available to claim</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Zero open pull requests: No duplicate work in progress</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Maintainer velocity: 1.8h avg response time</span>
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

                {/* Footer strip of card */}
                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Continuous Verification</span>
                  <span className="text-emerald-400">Zero stale collisions guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NUMBERS SECTION (MindCloud Pure White Section with Big Black Stats) */}
      <section id="numbers" className="bg-white py-20 sm:py-28 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                The numbers speak
                <br />
                for themselves.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed max-w-lg">
                Behind each recommendation is a real production workflow, moving
                data between federated code hosts, maintainer responsiveness
                history, and continuous unclaimed verification running every minute.
              </p>

              <div>
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Link to="/app/simulator">
                    <SlidersHorizontal className="size-4 mr-2 text-blue-600" />
                    Open What-If Simulator
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Floating Pill Cards on White */}
            <div className="space-y-3">
              {TELEMETRY_FEED.map((item) => (
                <div
                  key={item.action}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="size-5 text-blue-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                      {item.action}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Large Black Stat Figures (MindCloud Annual Numbers Grid) */}
          <div className="mt-20 border-t border-slate-100 pt-14">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-8 text-center sm:text-left">
              Live Engine Metrics
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  &lt; 2ms
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Ranking Latency
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  100%
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Unclaimed Guarantee
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  4 Hosts
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  GitHub, GitLab, Codeberg, Bugzilla
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  0%
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Hallucinated or Stale Tickets
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VIBRANT BLUE CTA CARD (MindCloud Exact .cta-section-card) */}
      <section className="bg-slate-50 py-20 sm:py-24 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-[#146dfc] p-8 sm:p-14 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Subtle grid lines background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="relative z-10 space-y-3 text-center sm:text-left max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Ready to ship your next open-source PR?
              </h2>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                Calibrate your capability profile in 60 seconds and find verified
                unclaimed tickets across GitHub, GitLab, Codeberg, and Bugzilla.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-900 hover:bg-slate-100 font-semibold px-6 shadow-md active:scale-[0.98]"
              >
                <Link to="/onboarding">Get started free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-blue-700/50 text-white hover:bg-blue-700 font-medium active:scale-[0.98]"
              >
                <Link to="/app/simulator">Try Simulator</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PURE WHITE FOOTER (MindCloud Exact Layout) */}
      <footer className="bg-white py-14 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  IP
                </div>
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  Issue Pilot
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Precision open-source issue intelligence powered by a compiled
                deterministic 6-factor ranking engine and real-time unclaimed verification.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Products
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link to="/app/feed" className="hover:text-slate-900">
                    Recommendations Feed
                  </Link>
                </li>
                <li>
                  <Link to="/app/simulator" className="hover:text-slate-900">
                    What-If Simulator
                  </Link>
                </li>
                <li>
                  <Link to="/app/explore" className="hover:text-slate-900">
                    Multi-Platform Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/onboarding" className="hover:text-slate-900">
                    Calibration Deck
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Architecture
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <a href="#pipeline" className="hover:text-slate-900">
                    6-Factor Scoring Model
                  </a>
                </li>
                <li>
                  <a href="#numbers" className="hover:text-slate-900">
                    Runtime Unclaimed Checks
                  </a>
                </li>
                <li>
                  <Link to="/app/feed" className="hover:text-slate-900">Live Recommendations</Link>
                </li>
                <li>
                  <Link to="/app/simulator" className="hover:text-slate-900">Weight Calibration</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
            <div>&copy; {new Date().getFullYear()} Issue Pilot, Inc. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span>GitHub</span>
              <span>GitLab</span>
              <span>Codeberg</span>
              <span>Bugzilla</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
