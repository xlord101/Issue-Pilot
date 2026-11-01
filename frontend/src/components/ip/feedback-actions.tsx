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
            "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.96]",
            vote === "like"
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-medium"
              : "border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
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
            "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.96]",
            vote === "dislike"
              ? "border-rose-500/50 bg-rose-500/15 text-rose-400 font-medium"
              : "border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
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
          className="h-8 border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white active:scale-[0.98]"
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
              className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.98]"
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
              className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm shadow-primary/20 active:scale-[0.98]"
            >
              <Check className="size-3.5 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={m.isPending}
              onClick={() => m.mutate("rejected")}
              className="h-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-[0.98]"
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
