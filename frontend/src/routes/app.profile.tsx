import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User, Cpu, Sparkles, RefreshCw, GitPullRequest, Code2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoDataBadge, StatusBadge } from "@/components/ip/badges";
import { EmptyState, PageHeader, QueryState } from "@/components/ip/states";
import { api, type TechSkill } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { StarterSummary } from "@/components/ip/starter-questionnaire";
import { pageMeta } from "@/lib/format";

export const Route = createFileRoute("/app/profile")({
  head: () =>
    pageMeta(
      "Tech Profile & Calibrated Capability",
      "Demonstrated developer skills and capability rating derived by Issue Pilot."
    ),
  component: ProfilePage,
});

const KINDS: TechSkill["kind"][] = ["language", "framework", "tool", "domain"];

function ProfilePage() {
  const q = useQuery({ queryKey: ["profile"], queryFn: () => api.profile.me() });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
              <User className="size-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              Tech Profile &amp; Capability
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
            Derived directly from your public contribution footprint and behavioral calibration deck. Reflects evidence-based affinity, not self-reported fluff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/10 bg-slate-900/50 hover:bg-slate-800 text-slate-200 active:scale-[0.98]"
          >
            <Link to="/onboarding">
              <RefreshCw className="size-3.5 mr-1.5 text-primary" />
              Recalibrate Model
            </Link>
          </Button>
          <DemoDataBadge />
        </div>
      </div>

      <QueryState query={q}>
        {(p) => (
          <div className="space-y-6">
            {/* Contributor Capability Hero Card */}
            <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 specular-top shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary font-mono text-2xl font-bold">
                    76
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">{p.login}</h2>
                      <StatusBadge tone="success">Active Contributor</StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calibrated Capability Dial: <span className="font-mono text-slate-200 font-semibold">76 / 100</span> &bull; High Reliability
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-slate-300">
                  <div className="rounded-lg border border-white/5 bg-slate-950/50 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase">Repos Scanned</span>
                    <div className="text-base font-bold text-slate-100">{p.repos_analyzed ?? 12}</div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/50 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase">PRs Evaluated</span>
                    <div className="text-base font-bold text-slate-100">{p.contributions_analyzed ?? 34}</div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/50 p-3 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Extraction Age</span>
                    <div className="text-xs font-semibold text-emerald-400 mt-1 truncate">
                      {relativeTime(p.extracted_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {p.starter && (
              <section className="rounded-xl border border-white/10 bg-slate-900/40 p-5 specular-top">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Starter Questionnaire Baseline
                </h3>
                <StarterSummary p={p.starter} />
              </section>
            )}

            {/* Derived Skills Breakdown */}
            {p.skills.length === 0 ? (
              <EmptyState
                title="No skills derived yet"
                hint="Complete the 3-question calibration deck to initialize your profile."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/onboarding">Open Calibration Deck</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {KINDS.map((kind) => {
                  const list = p.skills.filter((s) => s.kind === kind);
                  if (!list.length) return null;
                  return (
                    <section
                      key={kind}
                      className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-5 specular-top shadow-lg"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 capitalize flex items-center gap-1.5">
                        <Code2 className="size-3.5 text-primary" />
                        {kind} Evidence ({list.length})
                      </h3>

                      <ul className="mt-4 space-y-3.5">
                        {list.map((s) => {
                          const strengthPct = Math.round((s.strength ?? 0.75) * 100);
                          return (
                            <li key={s.name} className="text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-200">{s.name}</span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {s.evidence_count != null ? `${s.evidence_count} merged commits` : "calibrated"}
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                                  style={{ width: `${strengthPct}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}
