import { Link } from "@tanstack/react-router";
import type { Recommendation } from "@/lib/api";
import { LabelList, SourceBadge, VerificationBadge } from "./badges";
import { ScoreBreakdown, ScoreTotal } from "./score";
import { FeedbackActions } from "./feedback-actions";
import { Sparkles, ArrowRight } from "lucide-react";

export function IssueCard({ rec }: { rec: Recommendation }) {
  const { issue } = rec;

  return (
    <article className="group relative rounded-xl border border-slate-200/90 bg-white transition-all duration-180 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 shadow-xs">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_270px]">
        <div className="min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
              <SourceBadge source={issue.source} />
              <span className="font-mono text-slate-900 font-bold">{issue.repo_key}</span>
              <span className="font-mono text-slate-500">#{issue.native_id}</span>
              <div className="ml-auto sm:ml-0">
                <VerificationBadge issue={issue} />
              </div>
            </div>

            <h2 className="mt-2.5 text-base sm:text-lg font-bold tracking-tight leading-snug text-slate-900">
              <Link
                to="/app/recommendations/$id"
                params={{ id: rec.id }}
                className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:underline"
              >
                {issue.title}
              </Link>
            </h2>

            {issue.body && (
              <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                {issue.body}
              </p>
            )}

            {issue.technologies && issue.technologies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                {issue.technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3">
              <LabelList labels={issue.labels} source={issue.source} />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-slate-700 flex items-start gap-2.5">
            <Sparkles className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Why recommended: </span>
              <span className="text-slate-600">
                {rec.why ??
                  "High alignment with your verified skill profile and maintainer responsiveness."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Match Score
                </span>
                {rec.previous_score != null && rec.previous_score !== rec.total_score && (
                  <div
                    className="mt-0.5 font-mono text-[10px] text-amber-700 font-semibold"
                    title="Real-time feedback delta"
                  >
                    Personalized: {rec.previous_score} &rarr; {rec.total_score}
                  </div>
                )}
              </div>
              <ScoreTotal value={rec.total_score} />
            </div>

            <div className="mt-3">
              <ScoreBreakdown breakdown={rec.breakdown} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 rounded-b-xl">
        <FeedbackActions rec={rec} />
        <Link
          to="/app/recommendations/$id"
          params={{ id: rec.id }}
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          Detailed Breakdown <ArrowRight className="size-3" />
        </Link>
      </div>
    </article>
  );
}
