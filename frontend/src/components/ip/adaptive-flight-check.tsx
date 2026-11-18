import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type DiagnosticQuestion, type DiagnosticResult, type TechProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Zap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Award,
  CheckCircle2,
  Code2,
} from "lucide-react";

const SUPPORTED_TECHS = [
  "Python",
  "TypeScript",
  "React",
  "Go",
  "Java",
  "C++",
  "Docker",
  "OSS_Workflow",
];

export function AdaptiveFlightCheck({
  initialProfile,
  onFinished,
}: {
  initialProfile?: TechProfile | null;
  onFinished?: (result: DiagnosticResult) => void;
}) {
  const qc = useQueryClient();
  const [selectedTech, setSelectedTech] = useState<string>("Python");
  const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<DiagnosticResult | null>(null);

  const startMutation = useMutation({
    mutationFn: async (tech: string) => {
      const res = await api.onboarding.startDiagnostic({
        technology: tech,
        experience_anchor: initialProfile?.preferences?.["open_source_experience"] || "familiar",
        github_sync: Boolean(initialProfile?.is_github),
      });
      return res;
    },
    onSuccess: (data) => {
      setCurrentQuestion(data);
      setSelectedOptionId(null);
      setCompletedResult(null);
      toast.info(`Flight check started in ${data.technology}`, {
        description: `Starting at ${data.tier} tier scenario.`,
      });
    },
    onError: (err) => {
      toast.error("Could not start diagnostic session", {
        description: err instanceof Error ? err.message : "Server error",
      });
    },
  });

  const stepMutation = useMutation({
    mutationFn: async () => {
      if (!currentQuestion || !selectedOptionId) return null;
      const res = await api.onboarding.stepDiagnostic({
        session_id: currentQuestion.session_id,
        selected_option_id: selectedOptionId,
      });
      return res;
    },
    onSuccess: (res) => {
      if (!res) return;
      setSelectedOptionId(null);

      // Check if finished
      if ("status" in res && res.status === "completed") {
        const result = res as DiagnosticResult;
        setCompletedResult(result);
        setCurrentQuestion(null);
        qc.invalidateQueries({ queryKey: ["profile"] });
        qc.invalidateQueries({ queryKey: ["recommendations"] });
        toast.success("Calibration complete!", {
          description: `Calibrated to ${result.calibrated_capability}/100 with ${Math.round(
            result.confidence * 100,
          )}% confidence.`,
        });
        if (onFinished) {
          onFinished(result);
        }
      } else {
        // Next adaptive question
        const nextQ = res as DiagnosticQuestion;
        setCurrentQuestion(nextQ);
        toast.info(`Adaptive Step-Transition`, {
          description: `Adjusted to ${nextQ.tier} scenario based on your answer.`,
        });
      }
    },
    onError: (err) => {
      toast.error("Error submitting answer", {
        description: err instanceof Error ? err.message : "Submission failed",
      });
    },
  });

  // State 1: Completed Assessment Screen
  if (completedResult) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-10 shadow-lg shadow-slate-900/5 text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <ShieldCheck className="size-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-mono font-medium text-emerald-700">
            <Award className="size-3.5" />
            Active Test &amp; Dual-Signal Reconciled
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Flight Check Completed
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {completedResult.explanation}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-2 text-left font-mono text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="text-slate-500">Calibrated Capability</div>
            <div className="text-2xl font-bold text-blue-600 mt-0.5">
              {completedResult.calibrated_capability}
              <span className="text-xs font-normal text-slate-500"> / 100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 uppercase font-semibold">
              Tier: {completedResult.performance_tier}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="text-slate-500">Model Confidence</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {Math.round(completedResult.confidence * 100)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 capitalize font-medium truncate">
              {completedResult.github_reconciliation.mode.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {completedResult.verified_competencies.length > 0 && (
          <div className="max-w-md mx-auto text-left rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Verified Competencies
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {completedResult.verified_competencies.map((comp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{comp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 flex justify-center gap-3">
          <Button
            onClick={() => {
              setCompletedResult(null);
              setCurrentQuestion(null);
            }}
            variant="outline"
            className="text-xs font-mono"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Retake Test
          </Button>
          <Button
            asChild
            className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 active:scale-[0.98] shadow-sm"
          >
            <a href="/app/feed">
              View Recommended Issues
              <ArrowRight className="size-4 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // State 2: Active Question Screen
  if (currentQuestion) {
    return (
      <div className="space-y-6">
        {/* Header progress */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-mono font-bold text-sm">
              0{currentQuestion.question_number}
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Code2 className="size-3.5 text-blue-600" />
                {currentQuestion.technology} — Question {currentQuestion.question_number} of{" "}
                {currentQuestion.total_questions}
              </div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                Adaptive Difficulty Tier:{" "}
                <span className="font-mono font-bold text-blue-700">{currentQuestion.tier}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-slate-500">
            <span
              className={cn(
                "size-2 rounded-full",
                currentQuestion.question_number === 1 ? "bg-blue-600" : "bg-emerald-500",
              )}
            />
            <span>Step {currentQuestion.question_number} / 2</span>
          </div>
        </div>

        {/* Question scenario card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
              Engineering Scenario
            </span>
            <p className="text-sm font-medium text-slate-900 leading-relaxed sm:text-base">
              {currentQuestion.scenario}
            </p>
          </div>

          <div className="grid gap-3 pt-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOptionId(opt.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                  selectedOptionId === opt.id
                    ? "border-2 border-blue-600 bg-blue-50/60 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                )}
              >
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold transition-colors mt-0.5",
                    selectedOptionId === opt.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {opt.id}
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">{opt.text}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestion(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedOptionId || stepMutation.isPending}
              onClick={() => stepMutation.mutate()}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 active:scale-[0.98] shadow-sm"
            >
              {stepMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin mr-1.5" />
              ) : null}
              {currentQuestion.question_number === 1 ? "Next Question" : "Complete Flight Check"}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Launch / Start Screen
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-mono font-medium text-blue-700">
            <Zap className="size-3.5 text-amber-500" />
            30-Second Adaptive Flight Check
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
            Calibrate with Dynamic Engineering Scenarios
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
            Take 2 quick practical scenarios (zero trivia, zero textbook definitions) to compute
            your verified contributor capability ($S$) and reconcile with your GitHub profile.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select Target Technology
        </label>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_TECHS.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => setSelectedTech(tech)}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-xs font-mono transition-all active:scale-[0.98]",
                selectedTech === tech
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-1.5">
        <div className="font-semibold text-slate-800">How this works:</div>
        <ul className="list-disc pl-4 space-y-1 text-slate-600">
          <li>
            Starts with an <strong>Intermediate scenario</strong> (65 pts) in {selectedTech}.
          </li>
          <li>
            Adapts in real-time: optimal answer steps <strong>UP</strong> to Advanced, suboptimal steps{" "}
            <strong>DOWN</strong> to Beginner.
          </li>
          <li>
            Reconciles with GitHub: Quiet/Enterprise devs with 0 public repos are{" "}
            <strong>never penalized</strong>.
          </li>
        </ul>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => startMutation.mutate(selectedTech)}
          disabled={startMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 active:scale-[0.98] shadow-sm"
        >
          {startMutation.isPending ? (
            <RefreshCw className="size-4 animate-spin mr-1.5" />
          ) : (
            <Sparkles className="size-4 mr-1.5" />
          )}
          Launch 30s Flight Check
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
