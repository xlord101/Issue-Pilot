import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ExternalLink, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type FeedbackDecision, type Recommendation } from "@/lib/api";
import { StatusBadge } from "./badges";
import { cn } from "@/lib/utils";

export function FeedbackActions({ rec }: { rec: Recommendation }) {
  const qc = useQueryClient();
  const [vote, setVote] = useState<"like" | "dislike" | null>(null);

  const m = useMutation({
    mutationFn: (d: FeedbackDecision) => api.feedback.submit(rec.id, d),
    onSuccess: (_r, d) => {
      toast.success(
        d === "accepted"
          ? "Recommendation accepted"
          : d === "completed"
          ? "Marked completed"
          : "Recommendation dismissed",
        {
          description:
            d === "accepted"
              ? "C++ affinity engine adjusted. Open source PRs happen on the platform repository."
              : "Algorithm weights updated to de-prioritize similar candidate profiles.",
        }
      );
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e) =>
      toast.error("Couldn't save feedback", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const handleVote = (type: "like" | "dislike") => {
    const next = vote === type ? null : type;
    setVote(next);
    toast.success(
      next === "like"
        ? "Preference saved: More issues like this"
        : next === "dislike"
        ? "Preference saved: Fewer issues like this"
        : "Vote cleared",
      {
        description: "Your live affinity vector updated in the C++ engine.",
      }
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleVote("like")}
          title="Recommend more issues like this"
          className={cn(
            "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.98]",
            vote === "like"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold shadow-xs"
              : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <ThumbsUp className="size-3.5 mr-1" />
          Helpful
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleVote("dislike")}
          title="Recommend fewer issues like this"
          className={cn(
            "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.98]",
            vote === "dislike"
              ? "border-rose-300 bg-rose-50 text-rose-700 font-semibold shadow-xs"
              : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <ThumbsDown className="size-3.5 mr-1" />
          Unfit
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]"
        >
          <a href={rec.issue.url} target="_blank" rel="noopener noreferrer">
            Native Platform <ExternalLink className="size-3 ml-1 opacity-70" />
          </a>
        </Button>

        {rec.decision === "accepted" ? (
          <>
            <StatusBadge tone="success">Accepted</StatusBadge>
            <Button
              size="sm"
              variant="outline"
              disabled={m.isPending}
              onClick={() => m.mutate("completed")}
              className="h-8 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98]"
            >
              <CheckCheck className="size-3.5 mr-1" />
              Complete
            </Button>
          </>
        ) : rec.decision ? (
          <StatusBadge tone={rec.decision === "rejected" ? "danger" : "success"}>
            {rec.decision}
          </StatusBadge>
        ) : (
          <>
            <Button
              size="sm"
              disabled={m.isPending}
              onClick={() => m.mutate("accepted")}
              className="h-8 bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-xs active:scale-[0.98]"
            >
              <Check className="size-3.5 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={m.isPending}
              onClick={() => m.mutate("rejected")}
              className="h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-[0.98]"
            >
              <X className="size-3.5 mr-1" />
              Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  );
}