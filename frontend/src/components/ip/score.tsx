import { SIGNAL_META, SIGNAL_ORDER, type SignalScore } from "@/lib/api";
import { ConfidenceIndicator } from "./badges";

/** Displays backend-provided scores. The UI never computes or re-weights them. */
export function ScoreTotal({ value }: { value: number | null }) {
  return (
    <div className="text-right">
      <div className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value ?? "—"}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
        / 100 PTS
      </div>
    </div>
  );
}

function ordered(b: SignalScore[] | null) {
  if (!b) return [];
  return [...b].sort((x, y) => SIGNAL_ORDER.indexOf(x.signal) - SIGNAL_ORDER.indexOf(y.signal));
}

export function ScoreBreakdown({ breakdown, detailed }: { breakdown: SignalScore[] | null; detailed?: boolean }) {
  const rows = ordered(breakdown);
  if (rows.length === 0) return <p className="text-xs text-slate-500">No score breakdown available.</p>;

  return (
    <ul className="space-y-2.5">
      {rows.map((s) => {
        const meta = SIGNAL_META[s.signal];
        const pct = s.score === null || !s.max ? 0 : Math.max(0, Math.min(100, (s.score / s.max) * 100));
        const weight = meta ? Math.round(meta.weight * 100) : null;

        return (
          <li key={s.signal} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {meta?.label ?? s.signal}
                {!detailed && meta && (
                  <span className="ml-1 text-[10px] font-mono text-slate-500">
                    ({weight}%)
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <ConfidenceIndicator value={s.confidence} compact={!detailed} />
                <span className="font-mono text-[11px] text-slate-700 font-semibold tabular-nums">
                  {s.score ?? "—"}/{s.max}
                </span>
              </span>
            </div>

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            {detailed && (
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                {s.summary || meta?.description}
                {s.score !== null && meta && (
                  <span className="ml-1 font-mono text-blue-700 font-semibold">
                    (+{(s.score * meta.weight).toFixed(1)} pts)
                  </span>
                )}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}