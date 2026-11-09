import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SOURCES, type Source, type SortKey } from "@/lib/api";
import { sourceLabel } from "./badges";

export interface FeedFilters {
  source: Source | "all";
  tech: string;
  score: [number, number];
  sort: SortKey;
}

export const DEFAULT_FILTERS: FeedFilters = {
  source: "all",
  tech: "",
  score: [0, 100],
  sort: "score_desc",
};

export function FilterBar({
  value,
  onChange,
  onRefresh,
  refreshing,
}: {
  value: FeedFilters;
  onChange: (f: FeedFilters) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const set = <K extends keyof FeedFilters>(k: K, v: FeedFilters[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="mb-5 grid gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[160px_1fr_220px_170px_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="f-source" className="text-xs font-medium text-slate-600">
          Source Platform
        </Label>
        <Select
          value={value.source}
          onValueChange={(v) => set("source", v as FeedFilters["source"])}
        >
          <SelectTrigger id="f-source" className="h-9 border-slate-200 bg-white text-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {sourceLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-tech" className="text-xs font-medium text-slate-600">
          Technology Focus
        </Label>
        <Input
          id="f-tech"
          className="h-9 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-600"
          placeholder="e.g. Python, Rust, TypeScript"
          value={value.tech}
          onChange={(e) => set("tech", e.target.value)}
        />
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span id="f-score-label">Match Score Range</span>
          <span className="font-mono tabular-nums text-slate-800 font-bold">
            {value.score[0]}–{value.score[1]}
          </span>
        </div>
        <Slider
          aria-labelledby="f-score-label"
          min={0}
          max={100}
          step={5}
          value={value.score}
          onValueChange={(v) => set("score", [v[0], v[1]] as [number, number])}
          className="cursor-pointer"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-sort" className="text-xs font-medium text-slate-600">
          Sort Ordering
        </Label>
        <Select value={value.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger id="f-sort" className="h-9 border-slate-200 bg-white text-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score_desc">Highest match score</SelectItem>
            <SelectItem value="freshness_desc">Newest tickets</SelectItem>
            <SelectItem value="verified_desc">Recently verified</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RotateCw
          className={
            refreshing
              ? "size-3.5 mr-1.5 animate-spin text-blue-600"
              : "size-3.5 mr-1.5 text-slate-500"
          }
        />
        Refresh
      </Button>
    </div>
  );
}
