import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GitHubMark, GitLabMark, CodebergMark, BugzillaMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { AuroraBackground } from "@/components/ip/aurora-background";
import { pageMeta } from "@/lib/format";
import { ArrowRight, CheckCircle2, Compass, Check, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Issue Pilot — Precision Open-Source Matching Engine",
      "Intelligent recommendation engine and live unclaimed verification across GitHub, GitLab, Codeberg, and Bugzilla.",
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

const STEPS = [
  {
    stepNumber: "01",
    label: "Calibration",
    title: "Calibrate your skills",
    description:
      "Select your active tech stack and comfort level, or connect GitHub to derive your capability target directly from verified code history.",
    highlight: "No guesswork or subjective self-assessments",
  },
  {
    stepNumber: "02",
    label: "Matching",
    title: "Precision recommendations",
    description:
      "Our recommendation engine continuously scores issues across language familiarity, issue complexity, repository health, and maintainer response velocity.",
    highlight: "Ranked to your target growth zone",
  },
  {
    stepNumber: "03",
    label: "Verification",
    title: "Zero-collision guarantee",
    description:
      "Before any issue appears in your feed, live platform APIs verify zero active assignees and zero open pull requests. Never waste time on claimed tickets.",
    highlight: "Live checked across all 4 platforms",
  },
];

const PIPELINE_GUARANTEES = [
  {
    action: "Live API check confirms open state & zero active assignees",
    stage: "STEP 01",
  },
  {
    action: "Deterministic C++ engine evaluates 6 independent repository & fit signals",
    stage: "STEP 02",
  },
  {
    action: "Personal thumbs-up & thumbs-down history refines future rankings",
    stage: "STEP 03",
  },
  {
    action: "Scheduled discovery & refresh jobs prune closed or claimed issues",
    stage: "STEP 04",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

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
      <AuroraBackground intensity="vibrant" className="text-slate-900">
        {/* Navigation Bar inside Hero Header */}
        <header className="border-b border-slate-200/70 relative z-30">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-slate-900">
                <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                  <div className="size-3.5 rounded-sm bg-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-900">issue pilot</span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 font-medium">
                <Link to="/app/feed" className="hover:text-slate-900 transition-colors">
                  Recommendations
                </Link>
                <Link to="/app/explore" className="hover:text-slate-900 transition-colors">
                  Issue Explorer
                </Link>
                <a href="#pipeline" className="hover:text-slate-900 transition-colors">
                  How It Works
                </a>
                <a href="#numbers" className="hover:text-slate-900 transition-colors">
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
            Issue Pilot continuously indexes unclaimed issues across GitHub, GitLab, Codeberg, and
            Bugzilla, matching them to your verified stack proficiency and capability target.
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
                    <div className="text-sm font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{p.protocol}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (Clean, non-interactive 3-step feature section) */}
      <section id="pipeline" className="bg-slate-50/70 py-20 sm:py-28 border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Find issues you can actually ship.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Three simple steps to move from browsing open source to having your pull request
              reviewed and merged.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.stepNumber}
                className="relative rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {step.stepNumber}
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {step.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center text-xs font-medium text-slate-500">
                  <Check className="size-4 text-blue-600 mr-2 shrink-0" />
                  {step.highlight}
                </div>
              </div>
            ))}
          </div>

          {/* Clean Bottom Callout Banner */}
          <div className="mt-14 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-base font-bold text-slate-900">
                Ready to find your next open-source contribution?
              </div>
              <div className="text-sm text-slate-600">
                Calibrate your profile in under 2 minutes and explore personalized, unclaimed
                issues.
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                asChild
                variant="outline"
                className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98]"
              >
                <Link to="/app/explore">Explore issues</Link>
              </Button>
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 shadow-xs active:scale-[0.98]"
              >
                <Link to="/onboarding">Get started &rarr;</Link>
              </Button>
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
                Behind each recommendation is a real production workflow, moving data between
                federated code hosts, maintainer responsiveness history, and continuous unclaimed
                verification running every minute.
              </p>

              <div>
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Link to="/app/explore">
                    <Compass className="size-4 mr-2 text-blue-600" />
                    Explore Live Issues
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Factual Pipeline Stages */}
            <div className="space-y-3">
              {PIPELINE_GUARANTEES.map((item) => (
                <div
                  key={item.stage}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="size-5 text-blue-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-800">
                      {item.action}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 shrink-0">{item.stage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="mt-20 border-t border-slate-100 pt-14">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-8 text-center sm:text-left">
              Architecture Highlights
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  C++20
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Deterministic Scoring Core
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  Live API
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Pre-Delivery Verification
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
                  6 Signals
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Multi-Factor Compatibility
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
                Calibrate your capability profile in 60 seconds and find verified unclaimed tickets
                across GitHub, GitLab, Codeberg, and Bugzilla.
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
                <Link to="/app/explore">Explore Issues</Link>
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
                Precision open-source issue intelligence powered by our matching engine and
                real-time unclaimed verification.
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
                  <Link to="/app/explore" className="hover:text-slate-900">
                    Multi-Platform Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/app/profile" className="hover:text-slate-900">
                    Tech Profile &amp; Skills
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
                Platform
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <a href="#pipeline" className="hover:text-slate-900">
                    Developer Matching
                  </a>
                </li>
                <li>
                  <a href="#numbers" className="hover:text-slate-900">
                    Runtime Unclaimed Checks
                  </a>
                </li>
                <li>
                  <Link to="/app/feed" className="hover:text-slate-900">
                    Live Recommendations
                  </Link>
                </li>
                <li>
                  <Link to="/onboarding" className="hover:text-slate-900">
                    Behavioral Calibration
                  </Link>
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
