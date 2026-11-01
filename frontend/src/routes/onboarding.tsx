import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "@/components/ip/logo";
import { DemoDataBadge } from "@/components/ip/badges";
import { api, USE_MOCK_API, type StarterProfile } from "@/lib/api";
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
      "Calibrate your developer capability rating and technology stack for the 6-factor C++ ranking engine."
    ),
  component: OnboardingPage,
});

function OnboardingPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [calibrated, setCalibrated] = useState<CalibrationData | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (data: CalibrationData) => {
      // Map to StarterProfile for API compatibility
      const starter: StarterProfile = {
        languages: Object.keys(data.stack),
        technologies: Object.keys(data.stack),
        experience:
          data.experience === "first_time"
            ? "beginner"
            : data.experience === "seasoned"
            ? "advanced"
            : "intermediate",
        interests: [data.navigation, data.challengeGoal],
        contribution_areas: [data.challengeGoal],
        resume_filename: null,
      };

      try {
        await api.onboarding.submitStarterProfile(starter);
      } catch (e) {
        // Fallback gracefully in standalone mode
        console.warn("Backend onboarding API fallback:", e);
      }
      return data;
    },
    onSuccess: (data) => {
      setCalibrated(data);
      toast.success("Calibration complete!", {
        description: `Calibrated capability dial set to ${data.derivedCapability}/100 with ${Math.round(
          data.confidenceScore * 100
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
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 sm:px-8 backdrop-blur-xl specular-top">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-slate-300">C++ Ranking Engine Online</span>
          </div>
          <DemoDataBadge />
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        {calibrated ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 sm:p-10 backdrop-blur-2xl text-center specular-top shadow-2xl space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Profile Calibrated Successfully
              </h1>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Your contributor capability is tuned at{" "}
                <span className="font-mono font-bold text-primary">
                  {calibrated.derivedCapability}/100
                </span>
                . The 6-factor C++ ranking engine is now prepared to deliver precision recommendations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-2 text-left font-mono text-xs">
              <div className="rounded-lg border border-white/5 bg-slate-950/60 p-3">
                <div className="text-slate-500">Capability Dial</div>
                <div className="text-lg font-bold text-slate-100">{calibrated.derivedCapability} / 100</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-950/60 p-3">
                <div className="text-slate-500">Confidence Metric</div>
                <div className="text-lg font-bold text-emerald-400">
                  {Math.round(calibrated.confidenceScore * 100)}%
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/app/feed" })}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 active:scale-[0.98]"
              >
                Launch Recommendations Feed
                <ArrowRight className="size-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto border-white/10 text-slate-300"
              >
                <Link to="/app/simulator">Open What-If Simulator</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Smart Onboarding &amp; Calibration
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Calibrate your open-source profile in 3 questions. Unlike arbitrary keyword taggers, Issue Pilot calculates your capability dial and maps non-linear technology affinity vectors.
              </p>
            </div>

            <BehavioralCalibrationDeck
              onComplete={(data) => saveMutation.mutate(data)}
              pending={saveMutation.isPending}
            />
          </div>
        )}
      </main>
    </div>
  );
}
