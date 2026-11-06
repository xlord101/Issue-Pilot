import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ExternalLink, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type FeedbackDecision, type Recommendation } from "@/lib/api";
import { StatusBadge } from "./badges";
import { cn } from "@/lib/utils";

const DISLIKE_REASONS = [
  { id: "wrong_stack", label: "Not my tech stack" },
  { id: "too_complex", label: "Too complex" },
  { id: "too_simple", label: "Too simple" },
  { id: "vague_issue", label: "Unclear description" },
  { id: "mute_repo", label: "Don't show this repo" },
];

export function FeedbackActions({ rec }: { rec: Recommendation }) {
  const qc = useQueryClient();
  const [vote, setVote] = useState<"like" | "dislike" | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: ({ decision, reason }: { decision: FeedbackDecision; reason?: string }) =>
      api.feedback.submit(rec.id, decision, reason),
    onSuccess: (_r, { decision, reason }) => {
      const reasonLabel = DISLIKE_REASONS.find((r) => r.id === reason)?.label;
      toast.success(
        decision === "accepted"
          ? "Recommendation accepted"
          : decision === "completed"
          ? "Marked completed"
          : reasonLabel
          ? `Feedback saved: De-prioritizing ${reasonLabel.toLowerCase()}`
          : "Recommendation dismissed",
        {
          description:
            decision === "accepted"
              ? "Preferences adjusted. Real-world PRs happen on the native platform repository."
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
    if (vote === type) {
      setVote(null);
      setShowReasons(false);
      setSelectedReason(null);
      toast.info("Vote cleared");
      return;
    }

    setVote(type);

    if (type === "like") {
      setShowReasons(false);
      setSelectedReason(null);
      m.mutate({ decision: "accepted" });
    } else {
      setShowReasons(true);
    }
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    setShowReasons(false);
    m.mutate({ decision: "rejected", reason: reasonId });
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
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
          {selectedReason && (
            <span className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
              {DISLIKE_REASONS.find((r) => r.id === selectedReason)?.label}
            </span>
          )}
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
                onClick={() => m.mutate({ decision: "completed" })}
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
                onClick={() => m.mutate({ decision: "accepted" })}
                className="h-8 bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-xs active:scale-[0.98]"
              >
                <Check className="size-3.5 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={m.isPending}
                onClick={() => {
                  setVote("dislike");
                  setShowReasons(true);
                }}
                className="h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-[0.98]"
              >
                <X className="size-3.5 mr-1" />
                Dismiss
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dislike Reason 1-Click Chip Drawer */}
      {showReasons && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pb-1 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-slate-500 text-[11px] font-medium mr-1">
            Why wasn't this a fit?
          </span>
          {DISLIKE_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleReasonSelect(r.id)}
              className="px-2 py-0.5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition-colors active:scale-[0.97]"
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowReasons(false)}
            className="text-slate-400 hover:text-slate-600 text-[11px] ml-auto"
            title="Dismiss"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}