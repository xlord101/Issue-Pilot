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
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
              <User className="size-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Tech Profile &amp; Capability
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Derived directly from your public contribution footprint and behavioral calibration deck. Reflects evidence-based affinity, not self-reported surveys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
          >
            <Link to="/onboarding">
              <RefreshCw className="size-3.5 mr-1.5 text-blue-600" />
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
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-mono text-2xl font-bold shadow-xs">
                    {p.capability ?? 70}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{p.login}</h2>
                      <StatusBadge tone="success">Active Contributor</StatusBadge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Calibrated Capability Dial: <span className="font-mono text-blue-700 font-bold">{p.capability ?? 70} / 100</span> &bull; High Reliability
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Repos Scanned</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{p.repos_analyzed ?? 12}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">PRs Evaluated</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{p.contributions_analyzed ?? 34}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Extraction Age</span>
                    <div className="text-xs font-bold text-emerald-700 mt-1 truncate">
                      {relativeTime(p.extracted_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {p.starter && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                  <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white hover:bg-slate-50">
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
                      className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 capitalize flex items-center gap-1.5">
                        <Code2 className="size-3.5 text-blue-600" />
                        {kind} Evidence ({list.length})
                      </h3>

                      <ul className="mt-4 space-y-3.5">
                        {list.map((s) => {
                          const strengthPct = Math.round((s.strength ?? 0.75) * 100);
                          return (
                            <li key={s.name} className="text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{s.name}</span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  {s.evidence_count != null ? `${s.evidence_count} merged commits` : "calibrated"}
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
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