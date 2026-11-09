import { useDeferredValue, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SlidersHorizontal, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_FILTERS, FilterBar, type FeedFilters } from "@/components/ip/filter-bar";
import { IssueCard } from "@/components/ip/issue-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ip/states";
import { api } from "@/lib/api";
import { pageMeta } from "@/lib/format";

export const Route = createFileRoute("/app/feed")({
  head: () =>
    pageMeta(
      "Personalized Issue Feed",
      "Continuously verified open-source issues ranked for your demonstrated skillset.",
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              Personalized open-source issues matched to your skill profile and verified unclaimed
              in real-time.
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
        <LoadingState rows={3} label="Loading personalized recommendations" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No recommendations match these filters"
          hint="Try broadening your source platform or technology criteria, or recalibrate in onboarding."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>
              Showing {items.length} of {total ?? items.length} ranked candidates
            </span>
            <span>Ranked by total match score</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <IssueCard key={item.id} rec={item} />
            ))}
          </div>

          {q.hasNextPage && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs active:scale-[0.98]"
              >
                {q.isFetchingNextPage ? "Loading more..." : "Load more issues"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
