import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, ExternalLink, FileText } from "lucide-react";
import { LabelList, SourceBadge, VerificationBadge } from "@/components/ip/badges";
import { FeedbackActions } from "@/components/ip/feedback-actions";
import { ScoreBreakdown, ScoreTotal } from "@/components/ip/score";
import { EmptyState, QueryState } from "@/components/ip/states";
import { api, SIGNAL_META } from "@/lib/api";
import { pageMeta } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/recommendations/$id")({
  head: () =>
    pageMeta(
      "Recommendation Diagnostics & Evidence",
      "Full 6-factor score decomposition, signal confidences, and repository evidence.",
    ),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["recommendations", "detail", id],
    queryFn: () => api.recommendations.get(id),
  });

  return (
    <div className="space-y-6">
      <Link
        to="/app/feed"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to recommendations feed
      </Link>

      <QueryState query={q} loadingRows={2}>
        {(rec) => (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-6">
              {/* Header Box */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                  <SourceBadge source={rec.issue.source} />
                  <span className="font-mono text-slate-900 font-bold">{rec.issue.repo_key}</span>
                  <span className="font-mono text-slate-500">#{rec.issue.native_id}</span>
                  <div className="ml-auto">
                    <VerificationBadge issue={rec.issue} />
                  </div>
                </div>

                <h1 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                  {rec.issue.title}
                </h1>

                <div className="mt-4">
                  <LabelList labels={rec.issue.labels} source={rec.issue.source} />
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <FeedbackActions rec={rec} />
                </div>
              </div>

              {/* Explainable Fit */}
              <section className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-5 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Deterministic Ranking Justification
                </h2>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                  {rec.why ||
                    "6-factor ranking computed from verified repository and skill signals."}
                </p>
              </section>

              {/* Issue Description */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="size-4 text-blue-600" />
                  Issue Description
                </h2>
                {rec.issue.body ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                    {rec.issue.body}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400">
                    No description ingested. View the complete issue on the source repository.
                  </p>
                )}

                {rec.issue.technologies && rec.issue.technologies.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                    {rec.issue.technologies.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Supporting Evidence */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Signal Evidence Trail
                </h2>
                {rec.issue.evidence === null ? (
                  <EmptyState
                    title="No raw evidence trace"
                    hint="The backend returned aggregate metrics."
                  />
                ) : rec.issue.evidence.length === 0 ? (
                  <EmptyState
                    title="No individual evidence items"
                    hint="This ranking is based on aggregate repository statistics."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {rec.issue.evidence.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-1"
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-bold">
                          {ev.signal ? SIGNAL_META[ev.signal]?.label : "General Factor"}
                        </div>
                        <p className="text-slate-700">{ev.description}</p>
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-mono font-medium"
                          >
                            Inspect Source <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sticky Score Sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200/90 bg-white p-5 lg:sticky lg:top-24 shadow-sm space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Compatibility Signals
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Evaluated across verified skill, complexity, and repository health metrics
                  </p>
                </div>
                <ScoreTotal value={rec.total_score} />
              </div>

              <ScoreBreakdown breakdown={rec.breakdown} detailed />

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600 leading-relaxed">
                Match score is normalized 0–100 from live repository signals, maintainer velocity,
                and your personal feedback history.
              </div>

              <Button
                asChild
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-xs active:scale-[0.98]"
              >
                <a href={rec.issue.url} target="_blank" rel="noreferrer">
                  Open on {rec.issue.source} <ExternalLink className="size-3.5 ml-1.5" />
                </a>
              </Button>
            </aside>
          </div>
        )}
      </QueryState>
    </div>
  );
}
