import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SOURCES, type Source, type SortKey } from "@/lib/api";
import { sourceLabel } from "./badges";

export interface FeedFilters {
  source: Source | "all";
  tech: string;
  score: [number, number];
  sort: SortKey;
}

export const DEFAULT_FILTERS: FeedFilters = { source: "all", tech: "", score: [0, 100], sort: "score_desc" };

export function FilterBar({ value, onChange, onRefresh, refreshing }: {
  value: FeedFilters;
  onChange: (f: FeedFilters) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const set = <K extends keyof FeedFilters>(k: K, v: FeedFilters[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="mb-5 grid gap-4 rounded-md border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[160px_1fr_220px_170px_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="f-source" className="text-xs text-muted-foreground">Source</Label>
        <Select value={value.source} onValueChange={(v) => set("source", v as FeedFilters["source"])}>
          <SelectTrigger id="f-source" className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{sourceLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-tech" className="text-xs text-muted-foreground">Technology</Label>
        <Input id="f-tech" className="h-9" placeholder="e.g. Python, Go, TypeScript" value={value.tech} onChange={(e) => set("tech", e.target.value)} />
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span id="f-score-label">Score range</span>
          <span className="font-mono tabular-nums">{value.score[0]}–{value.score[1]}</span>
        </div>
        <Slider aria-labelledby="f-score-label" min={0} max={100} step={5} value={value.score} onValueChange={(v) => set("score", [v[0], v[1]] as [number, number])} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-sort" className="text-xs text-muted-foreground">Sort</Label>
        <Select value={value.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger id="f-sort" className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score_desc">Highest score</SelectItem>
            <SelectItem value="freshness_desc">Newest</SelectItem>
            <SelectItem value="verified_desc">Recently verified</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" className="h-9" onClick={onRefresh} disabled={refreshing}>
        <RotateCw className={refreshing ? "size-4 animate-spin" : "size-4"} />Refresh
      </Button>
    </div>
  );
}
