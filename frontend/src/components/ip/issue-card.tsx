import { Link } from "@tanstack/react-router";
import type { Recommendation } from "@/lib/api";
import { LabelList, SourceBadge, VerificationBadge } from "./badges";
import { ScoreBreakdown, ScoreTotal } from "./score";
import { FeedbackActions } from "./feedback-actions";
import { Sparkles } from "lucide-react";

export function IssueCard({ rec }: { rec: Recommendation }) {
  const { issue } = rec;

  return (
    <article className="group relative rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-slate-900/60 hover:-translate-y-0.5 specular-top shadow-lg shadow-black/20">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_270px]">
        <div className="min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <SourceBadge source={issue.source} />
              <span className="font-mono text-slate-300 font-medium">{issue.repo_key}</span>
              <span className="font-mono text-slate-500">#{issue.native_id}</span>
              <div className="ml-auto sm:ml-0">
                <VerificationBadge issue={issue} />
              </div>
            </div>

            <h2 className="mt-2.5 text-base sm:text-lg font-semibold tracking-tight leading-snug text-slate-100">
              <Link
                to="/app/recommendations/$id"
                params={{ id: rec.id }}
                className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
              >
                {issue.title}
              </Link>
            </h2>

            {issue.body && (
              <p className="mt-2 text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {issue.body}
              </p>
            )}

            {issue.technologies && issue.technologies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                {issue.technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-slate-300"
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

          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-slate-300 flex items-start gap-2">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Why recommended: </span>
              <span className="text-slate-300">{rec.why ?? "High alignment with your verified skill profile and maintainer responsiveness."}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-white/5 bg-slate-950/40 p-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Match Score
                </span>
                {rec.previous_score != null && rec.previous_score !== rec.total_score && (
                  <div
                    className="mt-0.5 font-mono text-[10px] text-amber-400"
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

      <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/40 px-5 py-3 rounded-b-xl">
        <FeedbackActions rec={rec} />
        <Link
          to="/app/recommendations/$id"
          params={{ id: rec.id }}
          className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Detailed Breakdown &rarr;
        </Link>
      </div>
    </article>
  );
}
