import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { NormalizedIssue, Source } from "@/lib/api";
import { relativeTime, absoluteTime } from "@/lib/format";

const SOURCE_LABEL: Record<Source, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  gitea: "Codeberg/Gitea",
  bugzilla: "Bugzilla",
};

const SOURCE_MARK: Record<Source, string> = {
  github: "GH",
  gitlab: "GL",
  gitea: "CB",
  bugzilla: "BZ",
};

export const sourceLabel = (s: Source) => SOURCE_LABEL[s] ?? s;

export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-xs text-slate-700 font-medium",
        className,
      )}
    >
      <span className="font-mono text-[10px] font-bold text-slate-900">
        {SOURCE_MARK[source] ?? "??"}
      </span>
      {sourceLabel(source)}
    </span>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";
const TONE: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  accent: "border-blue-200 bg-blue-50 text-blue-700",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Verification status is reported by the backend; the frontend never verifies. */
export function VerificationBadge({
  issue,
}: {
  issue: Pick<NormalizedIssue, "is_open" | "is_unassigned" | "verified_at">;
}) {
  let tone: Tone = "neutral";
  let label = "Unverified";
  if (issue.is_open === false) {
    tone = "danger";
    label = "Closed";
  } else if (issue.is_open === true && issue.is_unassigned === true) {
    tone = "success";
    label = "Open · unclaimed";
  } else if (issue.is_open === true && issue.is_unassigned === false) {
    tone = "warning";
    label = "Claimed";
  } else if (issue.is_open === true) {
    tone = "neutral";
    label = "Open · claim unknown";
  }
  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <span className="text-xs text-slate-500 font-mono" title={absoluteTime(issue.verified_at)}>
        verified {relativeTime(issue.verified_at)}
      </span>
    </span>
  );
}

/** labels:null = source has no label concept. labels:[] = none set. Kept distinct. */
export function LabelList({ labels, source }: { labels: string[] | null; source: Source }) {
  if (labels === null)
    return (
      <span className="text-xs italic text-slate-500">{sourceLabel(source)} has no labels</span>
    );
  if (labels.length === 0) return <span className="text-xs text-slate-500">No labels</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
      {labels.map((l) => (
        <li
          key={l}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700"
        >
          {l}
        </li>
      ))}
      <li className="self-center text-[11px] text-slate-400">
        Supporting signal — not sole decision
      </li>
    </ul>
  );
}

export function ConfidenceIndicator({
  value,
  compact,
}: {
  value: number | null;
  compact?: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">Confidence unknown</span>;
  }
  const v = Math.max(0, Math.min(1, value));
  const level = v >= 0.75 ? 3 : v >= 0.5 ? 2 : 1;
  const word = ["", "Low", "Medium", "High"][level];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Confidence ${word}, ${Math.round(v * 100)} percent`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-2.5 w-1 rounded-[1px]", i <= level ? "bg-blue-600" : "bg-slate-200")}
          />
        ))}
      </span>
      {!compact && (
        <span className="text-xs text-slate-500 font-mono">
          {word} · {Math.round(v * 100)}%
        </span>
      )}
    </span>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 fill-current", className)}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GitLabMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 fill-current", className)}>
      <path d="m23.6 9.89-1.22-3.76a.82.82 0 0 0-1.56 0L19.6 9.89H4.4L3.18 6.13a.82.82 0 0 0-1.56 0L.4 9.89a.83.83 0 0 0 .3 1l11.3 8.21 11.3-8.21a.83.83 0 0 0 .3-1ZM12 16.51 3.86 10.6h16.28L12 16.51Z" />
    </svg>
  );
}

export function CodebergMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 fill-current", className)}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

export function BugzillaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-4 fill-none stroke-current stroke-2", className)}
    >
      <rect width="8" height="12" x="8" y="8" rx="4" />
      <path d="m19 8-3 3" />
      <path d="m5 8 3 3" />
      <path d="m20 14-4 0" />
      <path d="m4 14 4 0" />
      <path d="m19 20-3-3" />
      <path d="m5 20 3-3" />
    </svg>
  );
}
