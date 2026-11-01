import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { NormalizedIssue, Source } from "@/lib/api";
import { USE_MOCK_API } from "@/lib/api";
import { relativeTime, absoluteTime } from "@/lib/format";

const SOURCE_LABEL: Record<Source, string> = { github: "GitHub", gitlab: "GitLab", gitea: "Codeberg/Gitea", bugzilla: "Bugzilla" };
const SOURCE_MARK: Record<Source, string> = { github: "GH", gitlab: "GL", gitea: "CB", bugzilla: "BZ" };
export const sourceLabel = (s: Source) => SOURCE_LABEL[s] ?? s;

export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground", className)}>
      <span className="font-mono text-[10px] font-medium text-foreground">{SOURCE_MARK[source] ?? "??"}</span>
      {sourceLabel(source)}
    </span>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";
const TONE: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  success: "border-success/40 text-success",
  warning: "border-warning/40 text-warning",
  danger: "border-destructive/50 text-destructive",
  accent: "border-primary/40 text-primary",
};

export function StatusBadge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs font-medium", TONE[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Verification status is reported by the backend; the frontend never verifies. */
export function VerificationBadge({ issue }: { issue: Pick<NormalizedIssue, "is_open" | "is_unassigned" | "verified_at"> }) {
  let tone: Tone = "neutral";
  let label = "Unverified";
  if (issue.is_open === false) { tone = "danger"; label = "Closed"; }
  else if (issue.is_open === true && issue.is_unassigned === true) { tone = "success"; label = "Open · unclaimed"; }
  else if (issue.is_open === true && issue.is_unassigned === false) { tone = "warning"; label = "Claimed"; }
  else if (issue.is_open === true) { tone = "neutral"; label = "Open · claim unknown"; }
  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <span className="text-xs text-muted-foreground" title={absoluteTime(issue.verified_at)}>
        verified {relativeTime(issue.verified_at)}
      </span>
    </span>
  );
}

/** labels:null = source has no label concept. labels:[] = none set. Kept distinct. */
export function LabelList({ labels, source }: { labels: string[] | null; source: Source }) {
  if (labels === null) return <span className="text-xs italic text-muted-foreground">{sourceLabel(source)} has no labels</span>;
  if (labels.length === 0) return <span className="text-xs text-muted-foreground">No labels</span>;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Labels">
      {labels.map((l) => (
        <li key={l} className="rounded-full border px-2 py-0.5 text-xs text-foreground/85">{l}</li>
      ))}
      <li className="self-center text-[11px] text-muted-foreground">Supporting signal — not the sole suitability decision.</li>
    </ul>
  );
}

export function DemoDataBadge({ className }: { className?: string }) {
  if (!USE_MOCK_API) return null;
  return (
    <span className={cn("inline-flex items-center rounded-sm border border-warning/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning", className)}>
      Demo data
    </span>
  );
}

export function ConfidenceIndicator({ value, compact }: { value: number | null; compact?: boolean }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">Confidence unknown</span>;
  }
  const v = Math.max(0, Math.min(1, value));
  const level = v >= 0.75 ? 3 : v >= 0.5 ? 2 : 1;
  const word = ["", "Low", "Medium", "High"][level];
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Confidence ${word}, ${Math.round(v * 100)} percent`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-[1px]", i <= level ? "bg-primary" : "bg-border")} />
        ))}
      </span>
      {!compact && <span className="text-xs text-muted-foreground">{word} · {Math.round(v * 100)}%</span>}
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
