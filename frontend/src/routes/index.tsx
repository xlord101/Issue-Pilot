import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GitHubMark, SourceBadge } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { pageMeta } from "@/lib/format";
import { SIGNAL_META, SIGNAL_ORDER, SOURCES } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Issue Pilot — Precision Open-Source Matching Engine",
      "Deterministic 6-factor recommendation core and live unclaimed verification across GitHub, GitLab, Codeberg, and Bugzilla."
    ),
  component: LandingPage,
});

const PRINCIPLES = [
  {
    title: "100% Live Unclaimed Verification",
    body: "Every candidate issue is re-verified at runtime across GitHub, GitLab, Codeberg, and Bugzilla. Stale issues or assigned work are pruned before reaching your feed.",
    badge: "Zero Stale Issues",
  },
  {
    title: "Authoritative C++ 6-Factor Model",
    body: "Deterministic scoring combining Skill Match (35%), Difficulty Alignment (25%), Maintainer Responsiveness (15%), Repo Health (10%), Taste Feedback (10%), and Freshness (5%).",
    badge: "Sub-2ms Ranking Core",
  },
  {
    title: "Real-Time What-If Calibration",
    body: "Interactive hardware fader controls allow adjusting factor weights live to observe sensitivity shifts across different contributor capability profiles.",
    badge: "Interactive Simulator",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl specular-top">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-900/60"
            >
              <Link to="/app/simulator">What-If Simulator</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 active:scale-[0.98]"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero Section */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>Native C++ Deterministic Scoring Core</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl sm:leading-[1.08]">
              Open-source issues you can{" "}
              <span className="text-primary underline decoration-primary/40 underline-offset-8">
                actually ship.
              </span>
            </h1>

            <p className="max-w-[48ch] text-base sm:text-lg leading-relaxed text-slate-400">
              Issue Pilot reads your public developer footprint, derives your verified capability dial, and matches live unclaimed issues across GitHub, GitLab, Codeberg, and Bugzilla.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                <Link to="/login">
                  <GitHubMark className="mr-2" />
                  Connect GitHub &amp; Launch
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/10 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-[0.98]"
              >
                <Link to="/app/simulator">
                  <SlidersHorizontal className="size-4 mr-2 text-primary" />
                  Try Simulator
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span>Read-only inspection</span>
              <span>&bull;</span>
              <span>No automated PR creation</span>
              <span>&bull;</span>
              <span>Public data only</span>
            </div>
          </div>

          {/* Right Card: 6-Factor Model Glass Visual */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-2xl p-6 specular-top shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Deterministic 6-Factor Model
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">100 PTS</span>
            </div>

            <div className="mt-5 space-y-3.5">
              {SIGNAL_ORDER.map((k) => {
                const m = SIGNAL_META[k];
                const pct = Math.round(m.weight * 100);
                return (
                  <div key={k} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-medium text-slate-300">{m.label}</span>
                      <span className="text-primary font-bold">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                        style={{ width: `${pct * 2.85}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-white/5 bg-slate-950/60 p-3 text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400">Score(u,i)</span> = 0.35S + 0.25D + 0.15R + 0.10H + 0.10F + 0.05N
            </div>
          </div>
        </section>

        {/* Supported Platforms Strip */}
        <section className="border-y border-white/10 bg-slate-950/40 py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Continuously Monitored Across:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SOURCES.map((s) => (
                <SourceBadge key={s} source={s} className="border-white/10 bg-slate-900/60" />
              ))}
            </div>
          </div>
        </section>

        {/* Core Principles */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="space-y-3 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Engineered for authentic contribution velocity
            </h2>
            <p className="text-sm text-slate-400">
              Open source is broken when generic AI bots suggest stale or claimed tickets. Issue Pilot combines native C++ ranking with real-time API verifications.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PRINCIPLES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 specular-top shadow-lg space-y-3"
              >
                <div className="inline-block rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 font-mono text-[11px] text-cyan-400 font-medium">
                  {item.badge}
                </div>
                <h3 className="text-base font-semibold text-slate-100">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 sm:p-12 specular-top shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Ready to find your next open-source contribution?
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Takes 60 seconds. Calibrate your capability deck and discover matching tickets across 4 platforms.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 shrink-0 active:scale-[0.98]"
            >
              <Link to="/onboarding">Get Started Free</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
          <span>Issue Pilot &bull; High-Performance Issue Intelligence</span>
          <span>GitHub &bull; GitLab &bull; Codeberg &bull; Bugzilla</span>
        </div>
      </footer>
    </div>
  );
}
