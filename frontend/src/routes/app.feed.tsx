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
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-7 specular-top shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                <LayoutList className="size-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Personalized Recommendations Feed
              </h1>
              <DemoDataBadge />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Issues are ranked through the native C++ 6-factor core ($S, D, R, H, F, N$) and verified live for open, unassigned status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/10 bg-slate-950/60 hover:bg-slate-800 text-slate-200 text-xs h-9 active:scale-[0.98]"
            >
              <Link to="/app/simulator">
                <SlidersHorizontal className="size-3.5 mr-1.5 text-primary" />
                Tune Weights in Simulator
              </Link>
            </Button>
          </div>
        </div>

        {/* Telemetry Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            C++ Ranking Core Active
          </span>
          <span className="text-slate-600">&bull;</span>
          <span>Capability Benchmark: 76/100</span>
          <span className="text-slate-600">&bull;</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3 text-cyan-400" />
            Zero-Assignment Verification
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
              className="border-white/10"
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-slate-200">{items.length}</span>
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
                className="border-white/10 bg-slate-900/40 text-slate-200 hover:text-white px-6 active:scale-[0.98]"
              >
                {q.isFetchingNextPage ? "Querying Engine…" : "Load More Candidates"}
              </Button>
            ) : (
              <span className="text-xs font-mono text-muted-foreground">
                End of candidate pool
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
