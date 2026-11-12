import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "@/components/ip/logo";
import { ErrorState } from "@/components/ip/states";
import { api, type StarterProfile } from "@/lib/api";
import {
  BehavioralCalibrationDeck,
  type CalibrationData,
} from "@/components/ip/starter-questionnaire";
import { pageMeta } from "@/lib/format";
import { Sparkles, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  head: () =>
    pageMeta(
      "Behavioral Calibration Flow",
      "Calibrate your developer capability rating and technology stack for personalized issue recommendations.",
    ),
  component: OnboardingPage,
});

function OnboardingPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [calibrated, setCalibrated] = useState<CalibrationData | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.me(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CalibrationData) => {
      const allKnownTechs = [
        "TypeScript",
        "Python",
        "React",
        "C++",
        "Java",
        "Go",
        "Rust",
        "FastAPI",
        "MongoDB",
        "Docker",
      ];
      // Any technology from the deck that is not in the active stack is explicitly dismissed
      const dismissed = allKnownTechs.filter((t) => data.stack[t] === undefined);

      const confirmed_skills = Object.entries(data.stack).map(([tech, score]) => ({
        technology: tech,
        score,
        level:
          score >= 85
            ? "expert"
            : score >= 70
              ? "advanced"
              : score >= 50
                ? "intermediate"
                : "beginner",
        category: "language",
      }));

      await api.onboarding.confirmCalibration({
        confirmed_skills,
        dismissed_skills: dismissed,
        capability: data.derivedCapability,
        capability_confidence: data.confidenceScore,
        open_source_experience: data.experience,
        codebase_navigation_comfort: data.navigation,
        target_challenge_goal: data.challengeGoal,
      });

      return data;
    },
    onSuccess: (data) => {
      setCalibrated(data);
      toast.success("Calibration complete", {
        description: `Calibrated capability dial set to ${data.derivedCapability}/100 with ${Math.round(
          data.confidenceScore * 100,
        )}% model confidence.`,
      });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (err) => {
      toast.error("Calibration submission error", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/80 px-5 sm:px-8 backdrop-blur-md">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/app/feed"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200/90 rounded-full px-3.5 py-1.5 bg-white hover:bg-slate-50 transition-all shadow-2xs active:scale-[0.98]"
          >
            &larr; Back to Feed
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        {profileQuery.isError ? (
          <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
        ) : calibrated ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-10 shadow-lg shadow-slate-900/5 text-center space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Profile Calibrated Successfully
              </h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your contributor capability is tuned at{" "}
                <span className="font-mono font-bold text-blue-600">
                  {calibrated.derivedCapability}/100
                </span>
                . The ranking engine is now prepared to deliver personalized recommendations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-2 text-left font-mono text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="text-slate-500">Capability Dial</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {calibrated.derivedCapability} / 100
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="text-slate-500">Confidence Metric</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">
                  {Math.round(calibrated.confidenceScore * 100)}%
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/app/feed" })}
                className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 font-medium px-8 active:scale-[0.98] shadow-sm"
              >
                Launch Recommendations Feed
                <ArrowRight className="size-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
              >
                <Link to="/app/explore">Explore Live Issues</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                  <Sparkles className="size-4" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Smart Onboarding &amp; Calibration
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Calibrate your open-source profile in 3 questions. Issue Pilot calculates your
                capability dial and maps your technology affinity vectors to surface the
                highest-signal issues.
              </p>
            </div>

            <BehavioralCalibrationDeck
              initialProfile={profileQuery.data}
              onComplete={(data) => saveMutation.mutate(data)}
              pending={saveMutation.isPending}
            />
          </div>
        )}
      </main>
    </div>
  );
}
