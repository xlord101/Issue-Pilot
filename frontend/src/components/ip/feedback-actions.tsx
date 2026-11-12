import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ExternalLink, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type FeedbackDecision, type Recommendation } from "@/lib/api";
import { StatusBadge } from "./badges";
import { cn } from "@/lib/utils";

const LIKE_REASONS = [
  { id: "strong_tech_fit", label: "Strong tech stack fit" },
  { id: "right_complexity", label: "Right complexity" },
  { id: "clear_scope", label: "Clear scope / repro" },
  { id: "active_repo", label: "Great repo / maintainer" },
  { id: "interesting_problem", label: "Interesting problem" },
];

const DISLIKE_REASONS = [
  { id: "wrong_stack", label: "Not my tech stack" },
  { id: "too_complex", label: "Too complex" },
  { id: "too_simple", label: "Too simple" },
  { id: "vague_issue", label: "Unclear description" },
  { id: "mute_repo", label: "Don't show this repo" },
];

export function FeedbackActions({ rec }: { rec: Recommendation }) {
  const qc = useQueryClient();
  const initialVote = rec.user_vote === 1 ? "like" : rec.user_vote === -1 ? "dislike" : null;

  const [vote, setVote] = useState<"like" | "dislike" | null>(initialVote);
  const [reasonDrawer, setReasonDrawer] = useState<"like" | "dislike" | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(rec.user_vote_reason ?? null);
  const [localDecision, setLocalDecision] = useState<FeedbackDecision | null>(rec.decision);

  useEffect(() => {
    setVote(rec.user_vote === 1 ? "like" : rec.user_vote === -1 ? "dislike" : null);
    setSelectedReason(rec.user_vote_reason ?? null);
    setLocalDecision(rec.decision);
  }, [rec.id, rec.user_vote, rec.user_vote_reason, rec.decision]);

  const platformIssueId = rec.issue.platform_issue_id || rec.id || rec.issue.native_id;

  const voteMutation = useMutation({
    mutationFn: async (vars: {
      action: "set" | "clear";
      voteVal?: 1 | -1;
      reason?: string;
      decisionAlso?: FeedbackDecision;
    }) => {
      if (vars.action === "clear") {
        await api.votes.remove({
          source: rec.issue.source,
          platform_issue_id: platformIssueId,
        });
        return vars;
      }

      await api.votes.record({
        source: rec.issue.source,
        platform_issue_id: platformIssueId,
        vote: vars.voteVal!,
        ...(vars.reason ? { reason: vars.reason } : {}),
        ...(rec.run_id ? { recommendation_run_id: rec.run_id } : {}),
      });

      if (vars.decisionAlso) {
        await api.feedback.submit(rec.id, vars.decisionAlso, vars.reason);
      }
      return vars;
    },
    onSuccess: (vars) => {
      if (vars.action === "clear") {
        toast.info("Vote removed from your preference history");
      } else if (vars.voteVal === 1) {
        const label = LIKE_REASONS.find((r) => r.id === vars.reason)?.label;
        toast.success(
          label ? `Saved positive signal: ${label}` : "Saved to your liked preference profile",
          {
            description:
              "C++ VoteAffinity will boost similar technologies, labels, and difficulty levels.",
          },
        );
      } else {
        const label = DISLIKE_REASONS.find((r) => r.id === vars.reason)?.label;
        toast.success(label ? `Feedback saved: ${label}` : "Saved negative signal", {
          description:
            vars.reason === "mute_repo"
              ? `Future recommendations will exclude ${rec.issue.repo_key}.`
              : "C++ VoteAffinity will de-prioritize similar candidate profiles.",
        });
      }
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e) => {
      toast.error("Couldn't save vote", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ decision, reason }: { decision: FeedbackDecision; reason?: string }) => {
      await api.feedback.submit(rec.id, decision, reason);
      if (decision === "accepted" && vote !== "like") {
        await api.votes
          .record({
            source: rec.issue.source,
            platform_issue_id: platformIssueId,
            vote: 1,
            ...(reason ? { reason } : {}),
            ...(rec.run_id ? { recommendation_run_id: rec.run_id } : {}),
          })
          .catch(() => {
            /* keep feedback even if vote call fails */
          });
      }
      return decision;
    },
    onSuccess: (decision) => {
      setLocalDecision(decision);
      if (decision === "accepted" && vote !== "like") {
        setVote("like");
      }
      toast.success(
        decision === "accepted"
          ? "Recommendation accepted"
          : decision === "completed"
            ? "Marked completed"
            : "Recommendation dismissed",
        {
          description:
            decision === "accepted"
              ? "Preference profile updated. Open the issue on the native platform to start."
              : decision === "completed"
                ? "Completion metric updated for future difficulty calibration."
                : "Algorithm weights updated.",
        },
      );
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) =>
      toast.error("Couldn't save feedback", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const handleVote = (type: "like" | "dislike") => {
    if (vote === type) {
      setVote(null);
      setReasonDrawer(null);
      setSelectedReason(null);
      voteMutation.mutate({ action: "clear" });
      return;
    }

    setVote(type);
    setSelectedReason(null);
    setReasonDrawer(type);

    // Record the vote immediately so it is never lost even if the user skips picking a tag
    voteMutation.mutate({
      action: "set",
      voteVal: type === "like" ? 1 : -1,
    });
  };

  const handleReasonSelect = (type: "like" | "dislike", reasonId: string) => {
    setSelectedReason(reasonId);
    setReasonDrawer(null);
    voteMutation.mutate({
      action: "set",
      voteVal: type === "like" ? 1 : -1,
      reason: reasonId,
      ...(type === "dislike" ? { decisionAlso: "rejected" as const } : {}),
    });
    if (type === "dislike") {
      setLocalDecision("rejected");
    }
  };

  const activeReasonLabel =
    vote === "like"
      ? LIKE_REASONS.find((r) => r.id === selectedReason)?.label
      : DISLIKE_REASONS.find((r) => r.id === selectedReason)?.label;

  const isBusy = voteMutation.isPending || decisionMutation.isPending;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => handleVote("like")}
            title="Recommend more issues like this"
            className={cn(
              "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.98]",
              vote === "like"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <ThumbsUp className="size-3.5 mr-1" />
            Helpful
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => handleVote("dislike")}
            title="Recommend fewer issues like this"
            className={cn(
              "h-8 px-2.5 rounded-md border text-xs transition-all active:scale-[0.98]",
              vote === "dislike"
                ? "border-rose-300 bg-rose-50 text-rose-700 font-semibold shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <ThumbsDown className="size-3.5 mr-1" />
            Unfit
          </Button>

          {activeReasonLabel && (
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-md border",
                vote === "like"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-rose-600 bg-rose-50 border-rose-200",
              )}
            >
              {activeReasonLabel}
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

          {localDecision === "accepted" ? (
            <>
              <StatusBadge tone="success">Accepted</StatusBadge>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => decisionMutation.mutate({ decision: "completed" })}
                className="h-8 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98]"
              >
                <CheckCheck className="size-3.5 mr-1" />
                Complete
              </Button>
            </>
          ) : localDecision ? (
            <StatusBadge tone={localDecision === "rejected" ? "danger" : "success"}>
              {localDecision}
            </StatusBadge>
          ) : (
            <>
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() => decisionMutation.mutate({ decision: "accepted" })}
                className="h-8 bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-xs active:scale-[0.98]"
              >
                <Check className="size-3.5 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isBusy}
                onClick={() => {
                  setVote("dislike");
                  setReasonDrawer("dislike");
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

      {/* Like / Dislike Reason 1-Click Chip Drawer */}
      {reasonDrawer && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5 py-2 px-3 rounded-lg border text-xs animate-in fade-in slide-in-from-top-1 duration-150",
            reasonDrawer === "like"
              ? "bg-emerald-50/60 border-emerald-200"
              : "bg-slate-50 border-slate-200",
          )}
        >
          <span className="text-slate-600 text-[11px] font-medium mr-1">
            {reasonDrawer === "like"
              ? "What made this a good fit? (optional)"
              : "Why wasn't this a fit? (optional)"}
          </span>
          {(reasonDrawer === "like" ? LIKE_REASONS : DISLIKE_REASONS).map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={isBusy}
              onClick={() => handleReasonSelect(reasonDrawer, r.id)}
              className={cn(
                "px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors active:scale-[0.97] cursor-pointer",
                selectedReason === r.id
                  ? reasonDrawer === "like"
                    ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                    : "border-rose-400 bg-rose-100 text-rose-800"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-700",
              )}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReasonDrawer(null)}
            className="text-slate-400 hover:text-slate-700 text-[11px] ml-auto cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
