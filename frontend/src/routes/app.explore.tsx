import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Compass,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  GitPullRequest,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge, sourceLabel } from "@/components/ip/badges";
import { pageMeta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/api";

export const Route = createFileRoute("/app/explore")({
  head: () =>
    pageMeta(
      "Multi-Platform Issue Explorer",
      "Unified open source intelligence across GitHub, GitLab, Codeberg, and Bugzilla."
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

const MONITORED_POOL: MonitoredIssue[] = [
  {
    id: "exp-1",
    source: "github",
    repo: "tiangolo/fastapi",
    native_id: "4821",
    title: "Fix MongoDB async connection pooling and reconnect timeouts in backend driver",
    body: "When high concurrency requests hit the async database handler, MongoDB connection pool limits can cause socket disconnects without automatic reconnect.",
    labels: ["bug", "async", "database"],
    technologies: ["FastAPI", "Python", "MongoDB"],
    difficulty: "advanced",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "2 min ago",
    url: "https://github.com/tiangolo/fastapi/issues/4821",
  },
  {
    id: "exp-2",
    source: "github",
    repo: "facebook/react",
    native_id: "29810",
    title: "TypeScript typing error for useEffect cleanup return signature in strict mode",
    body: "Type definition for useEffect returns undefined instead of Destructor function under strict null check flags in compiler v5.8.",
    labels: ["typescript", "typing", "good first issue"],
    technologies: ["TypeScript", "React"],
    difficulty: "beginner",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "5 min ago",
    url: "https://github.com/facebook/react/issues/29810",
  },
  {
    id: "exp-3",
    source: "gitlab",
    repo: "gitlab-org/gitlab-runner",
    native_id: "3892",
    title: "Kubernetes executor fails to pull secrets when token refresh coincides with pod startup",
    body: "Race condition in k8s executor authentication credentials provider when auto-rotating service account tokens.",
    labels: ["executor::kubernetes", "security", "help wanted"],
    technologies: ["Go", "Kubernetes", "Docker"],
    difficulty: "advanced",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "12 min ago",
    url: "https://gitlab.com/gitlab-org/gitlab-runner/-/issues/3892",
  },
  {
    id: "exp-4",
    source: "gitea",
    repo: "forgejo/forgejo",
    native_id: "1482",
    title: "Implement OIDC federated discovery cache header validation for identity providers",
    body: "Follow RFC 8414 Section 3 to ensure discovery document cache-control headers are honored during intermittent offline periods.",
    labels: ["kind/enhancement", "area/auth"],
    technologies: ["Go", "OAuth", "SQLite"],
    difficulty: "intermediate",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "18 min ago",
    url: "https://codeberg.org/forgejo/forgejo/issues/1482",
  },
  {
    id: "exp-5",
    source: "bugzilla",
    repo: "mozilla/gecko-dev",
    native_id: "1890214",
    title: "CSS subgrid gap calculations fail when grandparent container has fractional rem unit",
    body: "Subgrid tracks inherit computed values incorrectly when parent grid computes fractions less than 0.5px on high-DPI displays.",
    labels: ["Core", "Layout: Grid", "CSS"],
    technologies: ["C++", "Rust", "CSS"],
    difficulty: "advanced",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "30 min ago",
    url: "https://bugzilla.mozilla.org/show_bug.cgi?id=1890214",
  },
  {
    id: "exp-6",
    source: "github",
    repo: "pallets/flask",
    native_id: "5120",
    title: "Refactor blueprint routing dispatcher to support regex URL parameters",
    body: "Allow custom converters or regex patterns inside url_prefix to support dynamic subdomain multi-tenant routing.",
    labels: ["enhancement", "routing", "core"],
    technologies: ["Python", "HTTP"],
    difficulty: "intermediate",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "1 hr ago",
    url: "https://github.com/pallets/flask/issues/5120",
  },
  {
    id: "exp-7",
    source: "github",
    repo: "llvm/llvm-project",
    native_id: "84129",
    title: "Add CMake module support for MinGW GCC C++14 abi compatibility",
    body: "Fix linking issues with std::string copy-on-write ABI under older mingw runtime configurations.",
    labels: ["cmake", "build", "mingw"],
    technologies: ["C++", "CMake"],
    difficulty: "advanced",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "2 hr ago",
    url: "https://github.com/llvm/llvm-project/issues/84129",
  },
  {
    id: "exp-8",
    source: "github",
    repo: "psf/requests",
    native_id: "6390",
    title: "Clarify proxy authentication header documentation and SSL adapter examples",
    body: "The tutorial documentation lacks examples showing how to pass custom SSLContext to HTTPAdapter when authenticating through corporate proxy.",
    labels: ["docs", "good first issue"],
    technologies: ["Python", "Documentation"],
    difficulty: "beginner",
    isOpen: true,
    isUnassigned: true,
    verifiedAt: "3 hr ago",
    url: "https://github.com/psf/requests/issues/6390",
  },
];

const PLATFORMS: { id: "all" | Source; label: string }[] = [
  { id: "all", label: "All Platforms" },
  { id: "github", label: "GitHub" },
  { id: "gitlab", label: "GitLab" },
  { id: "gitea", label: "Codeberg" },
  { id: "bugzilla", label: "Bugzilla" },
];

const TECH_TAGS = ["All", "Python", "TypeScript", "React", "Go", "C++", "Rust", "FastAPI", "MongoDB"];

export function ExplorePage() {
  const [platform, setPlatform] = useState<"all" | Source>("all");
  const [tech, setTech] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("all");

  const filteredIssues = useMemo(() => {
    return MONITORED_POOL.filter((item) => {
      if (platform !== "all" && item.source !== platform) return false;
      if (tech !== "All" && !item.technologies.includes(tech)) return false;
      if (difficulty !== "all" && item.difficulty !== difficulty) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText =
          item.title.toLowerCase().includes(q) ||
          item.repo.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          item.technologies.some((t) => t.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [platform, tech, difficulty, search]);

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
              Inspect vetted issues across GitHub, GitLab, Codeberg, and Bugzilla. Every record is continuously verified for live unassigned status.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-700 font-semibold">
              <Layers className="size-3.5 text-blue-600" />
              <span>Pool: 4 Supported Platforms &bull; {MONITORED_POOL.length} Verified</span>
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
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Issues Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <span className="font-bold text-slate-900">{filteredIssues.length}</span> verified issues
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-medium">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Live verified unclaimed
          </span>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-sm text-slate-900 font-bold">No monitored issues match these filters</p>
            <p className="mt-1 text-xs text-slate-500">Try clearing your search query or selecting All Platforms.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPlatform("all");
                setTech("All");
                setDifficulty("all");
                setSearch("");
              }}
              className="mt-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
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
                      <a href={issue.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                        {issue.title}
                        <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </h2>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {issue.body}
                    </p>

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
                          : "border-slate-300 bg-slate-100 text-slate-800"
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
        )}
      </div>
    </div>
  );
}