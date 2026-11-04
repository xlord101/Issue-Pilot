import { useDeferredValue, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Sparkles, Cpu, RefreshCw, LayoutList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoDataBadge } from "@/components/ip/badges";
import { DEFAULT_FILTERS, FilterBar, type FeedFilters } from "@/components/ip/filter-bar";
import { IssueCard } from "@/components/ip/issue-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ip/states";
import { api } from "@/lib/api";
import { pageMeta } from "@/lib/format";

export const Route = createFileRoute("/app/feed")({
  head: () =>
    pageMeta(
      "Personalized Issue Feed",
      "Continuously verified open-source issues ranked for your demonstrated skillset."
    ),
  component: Feed,
});

function Feed() {
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const f = useDeferredValue(filters);

  const q = useInfiniteQuery({
    queryKey: ["recommendations", f],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.recommendations.list({
        source: f.source === "all" ? undefined : f.source,
        tech: f.tech.trim() || undefined,
        min_score: f.score[0] > 0 ? f.score[0] : undefined,
        max_score: f.score[1] < 100 ? f.score[1] : undefined,
        sort: f.sort,
        cursor: pageParam,
        limit: 4,
      }),
    getNextPageParam: (last) => last.next_cursor,
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const total = q.data?.pages[0]?.total;

  return (
    <div className="space-y-8">
      {/* Hero Feed Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <LayoutList className="size-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Personalized Recommendations Feed
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Issues are scored across six factors ($S, D, R, H, F, N$) and verified live for open, unassigned status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 active:scale-[0.98]"
            >
              <Link to="/app/simulator">
                <SlidersHorizontal className="size-3.5 mr-1.5 text-blue-600" />
                Tune Weights in Simulator
              </Link>
            </Button>
          </div>
        </div>

        {/* Telemetry Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            6-Factor Ranking Engine Active
          </span>
          <span className="text-slate-300">&bull;</span>
          <span>Capability Benchmark: <strong className="text-slate-800">76/100</strong></span>
          <span className="text-slate-300">&bull;</span>
          <span className="flex items-center gap-1 text-slate-700">
            <CheckCircle2 className="size-3.5 text-blue-600" />
            Zero-Assignment Live Verification
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
      />

      {/* Issues List */}
      {q.isPending ? (
        <LoadingState rows={3} label="Running 6-factor ranking core" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No recommendations match these filters"
          hint="Try adjusting the match score range, clearing the technology query, or selecting All Platforms."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <span className="font-bold text-slate-900">{items.length}</span>
              {total != null ? ` of ${total} ranked candidates` : " candidates"}
            </span>
            <span className="font-mono text-[11px]">Ranked by total match score</span>
          </div>

          <div className="stagger space-y-4">
            {items.map((r) => (
              <IssueCard key={r.id} rec={r} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            {q.hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-6 active:scale-[0.98]"
              >
                {q.isFetchingNextPage ? "Querying Engine…" : "Load More Candidates"}
              </Button>
            ) : (
              <span className="text-xs font-mono text-slate-400">
                End of candidate pool
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}