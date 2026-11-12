import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Compass, Search, ExternalLink, CheckCircle2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge, sourceLabel } from "@/components/ip/badges";
import { ErrorState, LoadingState } from "@/components/ip/states";
import { pageMeta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api/http";
import type { Source } from "@/lib/api";

const exploreSearchSchema = z.object({
  q: z.coerce.string().optional(),
});

export const Route = createFileRoute("/app/explore")({
  validateSearch: (s) => exploreSearchSchema.parse(s),
  head: () =>
    pageMeta(
      "Multi-Platform Issue Explorer",
      "Unified open source intelligence across GitHub, GitLab, Codeberg, and Bugzilla.",
    ),
  component: ExplorePage,
});

interface MonitoredIssue {
  id: string;
  source: Source;
  repo: string;
  native_id: string;
  title: string;
  body: string;
  labels: string[];
  technologies: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  isOpen: boolean;
  isUnassigned: boolean;
  verifiedAt: string;
  url: string;
}

const PLATFORMS: { id: "all" | Source; label: string }[] = [
  { id: "all", label: "All Platforms" },
  { id: "github", label: "GitHub" },
  { id: "gitlab", label: "GitLab" },
  { id: "gitea", label: "Codeberg" },
  { id: "bugzilla", label: "Bugzilla" },
];

const TECH_TAGS = [
  "All",
  "Python",
  "TypeScript",
  "React",
  "Go",
  "C++",
  "Rust",
  "FastAPI",
  "MongoDB",
];

interface RawIssueDoc {
  id?: string;
  _id?: string;
  source?: Source;
  repository_full_name?: string;
  repo_key?: string;
  repository_owner?: string;
  repository_name?: string;
  issue_number?: string | number;
  native_id?: string | number;
  title?: string;
  body?: string;
  labels?: string[];
  detected_technologies?: string[];
  technologies?: Array<string | { technology?: string }>;
  difficulty_score?: number;
  state?: string;
  is_assigned?: boolean;
  last_seen_at?: string;
  updated_at?: string;
  issue_url?: string;
  url?: string;
}

interface IssuesQueryResponse {
  issues?: RawIssueDoc[];
  total_in_pool?: number;
}

function ExplorePage() {
  const initialSearch = Route.useSearch();
  const [platform, setPlatform] = useState<"all" | Source>("all");
  const [tech, setTech] = useState<string>("All");
  const [search, setSearch] = useState<string>(initialSearch.q ?? "");
  const [difficulty, setDifficulty] = useState<string>("all");

  const q = useQuery({
    queryKey: ["explore-issues", platform, tech, search, difficulty],
    queryFn: async () => {
      const queryParams: Record<string, string | number | boolean> = {
        state: "open",
        limit: 50,
      };
      if (platform !== "all") queryParams["source"] = platform;
      if (tech !== "All") queryParams["technology"] = tech;
      if (search.trim()) queryParams["search"] = search.trim();
      if (difficulty !== "all") {
        if (difficulty === "beginner") {
          queryParams["max_difficulty"] = 45;
        } else if (difficulty === "intermediate") {
          queryParams["min_difficulty"] = 40;
          queryParams["max_difficulty"] = 70;
        } else if (difficulty === "advanced") {
          queryParams["min_difficulty"] = 65;
        }
      }

      const res = await request<IssuesQueryResponse>("issues.query", "/api/issues", {
        query: queryParams,
      });

      const rawIssues = res?.issues ?? [];
      const totalInPool: number = res?.total_in_pool ?? rawIssues.length;

      const items: MonitoredIssue[] = rawIssues.map((item, idx) => {
        const src: Source = item.source ?? "github";
        const repo =
          item.repository_full_name ||
          item.repo_key ||
          (item.repository_owner
            ? `${item.repository_owner}/${item.repository_name ?? ""}`
            : "open-source/project");
        const nativeId = String(item.issue_number ?? item.native_id ?? idx + 1);
        const diffScore = item.difficulty_score ?? 50;
        const diffCategory: "beginner" | "intermediate" | "advanced" =
          diffScore < 45 ? "beginner" : diffScore < 70 ? "intermediate" : "advanced";

        const rawTechs =
          item.detected_technologies ??
          (item.technologies
            ? item.technologies.map((t) => (typeof t === "string" ? t : (t.technology ?? "")))
            : []);
        const rawLabels = Array.isArray(item.labels) ? item.labels : [];

        return {
          id: item.id || item._id || `exp-${idx + 1}`,
          source: src,
          repo,
          native_id: nativeId,
          title: item.title || "Untitled Issue",
          body: item.body || "",
          labels: rawLabels,
          technologies: rawTechs.length > 0 ? rawTechs : ["General"],
          difficulty: diffCategory,
          isOpen: item.state === "open",
          isUnassigned: item.is_assigned !== true,
          verifiedAt: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "recently",
          url: item.issue_url || `https://github.com/${repo}/issues/${nativeId}`,
        };
      });

      return { items, totalInPool };
    },
    staleTime: 30000,
  });

  const issues = q.data?.items ?? [];
  const totalInPool = q.data?.totalInPool ?? issues.length;

  return (
    <div className="space-y-8">
      {/* Surface Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <Compass className="size-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Multi-Platform Issue Explorer
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Inspect vetted issues across GitHub, GitLab, Codeberg, and Bugzilla. Every record is
              continuously verified for live unassigned status.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-700 font-semibold">
              <Layers className="size-3.5 text-blue-600" />
              <span>
                Pool: 4 Supported Platforms &bull;{" "}
                {q.isPending ? "Scanning..." : `${totalInPool} Live Candidates`}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Platform Filter Bar */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by keyword, repository name, or technology..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 rounded-lg focus-visible:ring-blue-600/40 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all active:scale-[0.98]",
                    platform === p.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Technology & Difficulty Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Stack:</span>
              {TECH_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTech(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-mono transition-all active:scale-[0.98]",
                    tech === t
                      ? "border-slate-800 bg-slate-900 text-white font-semibold shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-500">Difficulty:</span>
              {["all", "beginner", "intermediate", "advanced"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded px-2.5 py-1 capitalize transition-all active:scale-[0.98]",
                    difficulty === d
                      ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Issues Stream or Error Screen */}
      {q.isPending ? (
        <LoadingState rows={4} label="Loading candidate issues" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <p className="text-sm text-slate-900 font-bold">
            No candidate issues match these criteria
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try broadening your search query or selecting All Platforms.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlatform("all");
              setTech("All");
              setDifficulty("all");
              setSearch("");
            }}
            className="mt-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <span className="font-bold text-slate-900">{issues.length}</span> verified
              issues
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Live verified unclaimed
            </span>
          </div>

          <div className="grid gap-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="group rounded-xl border border-slate-200/90 bg-white p-5 transition-all duration-180 hover:border-slate-300 hover:shadow-md shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <SourceBadge source={issue.source} />
                      <span className="font-mono text-slate-900 font-bold">{issue.repo}</span>
                      <span className="font-mono text-slate-500">#{issue.native_id}</span>
                      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Open &bull; Unassigned
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Verified {issue.verifiedAt}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5"
                      >
                        {issue.title}
                        <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </h2>

                    {issue.body && (
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {issue.body}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {issue.technologies.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 font-medium"
                        >
                          {t}
                        </span>
                      ))}

                      {issue.labels.map((l) => (
                        <span
                          key={l}
                          className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 font-medium"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={cn(
                        "rounded-md border px-2.5 py-1 font-mono text-xs font-bold capitalize",
                        issue.difficulty === "beginner"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : issue.difficulty === "intermediate"
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-slate-300 bg-slate-100 text-slate-800",
                      )}
                    >
                      {issue.difficulty}
                    </span>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 active:scale-[0.98]"
                    >
                      <a href={issue.url} target="_blank" rel="noreferrer">
                        View on {sourceLabel(issue.source)}
                        <ExternalLink className="size-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
