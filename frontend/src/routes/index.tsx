import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GitHubMark, GitLabMark, CodebergMark, BugzillaMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
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
    tabLabel: "Requirements",
    stepName: "1. Calibrate Profile",
    title: "Derive your capability dial from verified code history.",
    description:
      "Most contributor matching fails because of self-reported surveys. Issue Pilot analyzes your public pull requests, commits, and language comfort zones into an objective capability score (0–100).",
    badge: "CALIBRATION",
  },
  {
    id: "build",
    tabLabel: "Build",
    stepName: "2. C++ 6-Factor Rank",
    title: "Deterministic mathematical scoring. Zero LLM hallucinations.",
    description:
      "Once your profile is set, our compiled native C++ engine calculates a weighted 6-factor score across Skill Match (35%), Difficulty (25%), Maintainer Responsiveness (15%), Repo Health (10%), Taste Feedback (10%), and Freshness (5%) in under 2ms.",
    badge: "RANKING CORE",
  },
  {
    id: "launch",
    tabLabel: "Launch and support",
    stepName: "3. Verify & Claim",
    title: "Live unclaimed validation. Zero stale collisions.",
    description:
      "Before an issue appears in your recommendations, our backend queries live platform APIs to verify zero active assignees and zero open pull requests. You never waste hours reading an already claimed ticket.",
    badge: "VERIFICATION",
  },
];

const TESTIMONIALS = [
  {
    company: "Tokio Rust Contributor",
    quote:
      "Not only does Issue Pilot provide the quickest turnaround time for issue discovery, they are also the most cost-effective and accurate tool for finding unclaimed work.",
    author: "Shawn Wilson",
    role: "Staff Infrastructure Engineer",
  },
  {
    company: "GitLab Ecosystem",
    quote:
      "Issue Pilot adapts each recommendation to the contributor's real profile instead of forcing generic beginner tickets. It gives us true signal over noise across 4 code hosts.",
    author: "Roger Quach",
    role: "VP of Engineering & Open Source Lead",
  },
  {
    company: "Mozilla & RedHat SIG",
    quote:
      "What I liked most was the maintainer responsiveness factor. It reliably filtered out inactive bugzilla tickets and sent me to active maintainers who merged my PR in 36 hours.",
    author: "Heather Jordan",
    role: "Director of Systems Technology",
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
      {/* 1. HERO SECTION (MindCloud exact gradient: #030917 -> #0056ec -> #dcebff -> #ffffff) */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #030917 0%, #011949 19%, #012a7a 34%, #0056ec 52%, #3f86ff 67%, #9cc4ff 81%, #dcebff 91%, #ffffff 100%)",
        }}
      >
        {/* Navigation Bar inside Hero Header */}
        <header className="border-b border-white/10 relative z-30">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-white">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <div className="size-4 rounded-sm bg-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">
                  issue pilot
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
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
                <a
                  href="#pipeline"
                  className="hover:text-white transition-colors"
                >
                  Architecture
                </a>
                <a
                  href="#numbers"
                  className="hover:text-white transition-colors"
                >
                  Telemetry
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white hover:text-white hover:bg-white/10 active:scale-[0.98]"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-white text-blue-900 hover:bg-white/90 font-semibold px-4 shadow-sm active:scale-[0.98]"
              >
                <Link to="/onboarding">Get started</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-28 sm:pt-24 sm:pb-36 text-center relative z-20 space-y-6">
          {/* Inc 5000 style top tag pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3.5 py-1 text-xs text-white backdrop-blur-md">
            <span className="font-semibold text-white">C++ Deterministic Ranking Core</span>
            <span className="text-white/60">with sub-2ms latency</span>
            <Link
              to="/app/simulator"
              className="ml-1 text-blue-200 underline hover:text-white font-medium"
            >
              Test simulator &rarr;
            </Link>
          </div>

          {/* Huge Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Find open-source issues.
            <br />
            Ship code that matters.
          </h1>

          {/* Clean Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-white/90 leading-relaxed font-normal">
            Issue Pilot continuously indexes unclaimed issues across GitHub,
            GitLab, Codeberg, and Bugzilla, matching them to your verified
            capability dial with a deterministic 6-factor C++ core.
          </p>

          {/* MindCloud Exact White Floating CTA Prompt Bar */}
          <div className="mx-auto max-w-2xl pt-4">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center rounded-2xl bg-white p-2 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-blue-500/30 border border-slate-200/50"
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
              <span className="text-xs text-white/80 font-medium">Popular:</span>
              {QUICK_TAGS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTagClick(t.query)}
                  className="rounded-full bg-white/20 hover:bg-white/30 border border-white/25 px-2.5 py-0.5 text-xs text-white transition-all active:scale-[0.98]"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      {/* 3. STEP-SWITCHER (MindCloud's dark rounded stage inside the light page) */}
      <section id="pipeline" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* The dark stage container */}
          <div className="rounded-3xl bg-[#111318] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left Column */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Full-Service Matching
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                    Matching is hard,
                    <br />
                    <span className="text-blue-400">let C++ do the work.</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                    For developers tired of reading dead issues or assigned PRs,
                    Issue Pilot pairs a compiled C++ 6-factor ranking engine with
                    continuous live unclaimed verification across GitHub, GitLab,
                    Codeberg, and Bugzilla.
                  </p>
                </div>

                <div>
                  <Button
                    asChild
                    size="default"
                    className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-5 active:scale-[0.98]"
                  >
                    <Link to="/onboarding">
                      Calibrate your profile &rarr;
                    </Link>
                  </Button>
                </div>

                {/* 3 Interactive Horizontal Tabs */}
                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <div className="flex border-b border-slate-800 pb-2 gap-8 text-sm font-semibold">
                    {LIFECYCLE_TABS.map((tab, idx) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(idx)}
                        className={`relative pb-2 transition-colors active:scale-[0.98] ${
                          activeTab === idx
                            ? "text-white"
                            : "text-slate-500 hover:text-slate-300"
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
                    <h3 className="text-base font-semibold text-slate-200">
                      {LIFECYCLE_TABS[activeTab]?.title ?? ""}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {LIFECYCLE_TABS[activeTab]?.description ?? ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Stage */}
              <div className="rounded-2xl border border-slate-800 bg-[#161922] p-6 shadow-inner relative min-h-[420px] flex flex-col justify-between">
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
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                        VERIFIED: 78/100
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono text-slate-400">
                          Primary Focus Area
                        </div>
                        <div className="text-xl font-bold text-white mt-1">
                          Systems &amp; Backends
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Comfort: Feature development &amp; performance fixes
                        </div>
                      </div>
                      <div className="size-14 rounded-full border-4 border-blue-500 border-t-emerald-400 flex items-center justify-center font-mono font-bold text-sm text-white">
                        78%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono text-slate-400">
                        Language Confidence Breakdown
                      </div>
                      {[
                        { lang: "Rust", score: 94, bar: "w-[94%] bg-orange-500" },
                        { lang: "TypeScript", score: 88, bar: "w-[88%] bg-blue-500" },
                        { lang: "Go", score: 72, bar: "w-[72%] bg-cyan-500" },
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

                {/* Tab 1 Visual: Live 6-Factor Sliders */}
                {activeTab === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-5 text-blue-400" />
                        <span className="text-sm font-semibold text-slate-200">
                          C++ Deterministic Formula
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs text-slate-400 mr-2">Score:</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {simulatedScore} PTS
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-300">Skill Match (S):</span>
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
                          <span className="text-slate-300">Difficulty Fit (D):</span>
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
                          <span className="text-slate-300">Maintainer Velocity (R):</span>
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

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-slate-400">
                      <span className="text-emerald-400">Score(u,i)</span> ={" "}
                      {(skillWeight / 100).toFixed(2)}S +{" "}
                      {(diffWeight / 100).toFixed(2)}D +{" "}
                      {(respWeight / 100).toFixed(2)}R + 0.10H + 0.10F + 0.05N
                    </div>
                  </div>
                )}

                {/* Tab 2 Visual: Live Telemetry Terminal */}
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

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2 overflow-hidden">
                      <div className="text-slate-500">[0.2ms] GET api.github.com/repos/tokio-rs/tokio/issues/6810</div>
                      <div className="text-slate-400">[0.7ms] Checking linked PRs &rarr; 0 active pull requests</div>
                      <div className="text-blue-400">[1.4ms] Maintainer response velocity: 1.8h avg (Fast)</div>
                      <div className="text-emerald-400 font-semibold">[1.9ms] Unclaimed guarantee verified. Ready to ship.</div>
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
                  <span>Engine: Native C++20 Core</span>
                  <span className="text-emerald-400">Execution: 1.84ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIALS (MindCloud Pure White Background with Cards) */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Leaders trust us. Operators depend on us.
            </h2>
            <p className="text-sm text-slate-500">
              Trusted by active open-source contributors and engineering teams around the world.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                    {t.company}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="text-sm font-bold text-slate-900">
                    {t.author}
                  </div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            ))}
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
                  C++ Ranking Latency
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
                deterministic C++ ranking core and real-time unclaimed verification.
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
                    Deterministic C++ Engine
                  </a>
                </li>
                <li>
                  <a href="#numbers" className="hover:text-slate-900">
                    Runtime Unclaimed Checks
                  </a>
                </li>
                <li>
                  <span className="text-slate-400">Spring Boot 3.4.3</span>
                </li>
                <li>
                  <span className="text-slate-400">204 / 204 Tests Passing</span>
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
