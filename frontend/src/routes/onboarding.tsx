import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "@/components/ip/logo";
import { ErrorState, LoadingState } from "@/components/ip/states";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import {
  BehavioralCalibrationDeck,
  type CalibrationData,
} from "@/components/ip/starter-questionnaire";
import { pageMeta } from "@/lib/format";
import { Sparkles, ArrowRight, ShieldCheck, GitBranch, RefreshCw } from "lucide-react";
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
  const sessionQuery = useSession();
  const [calibrated, setCalibrated] = useState<CalibrationData | null>(null);

  useEffect(() => {
    if (sessionQuery.isSuccess && !sessionQuery.data) {
      navigate({ to: "/login", replace: true });
    }
  }, [sessionQuery.isSuccess, sessionQuery.data, navigate]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.me(),
    enabled: Boolean(sessionQuery.data),
  });

  const autoScannedRef = useRef(false);
  const analyzeMutation = useMutation({
    mutationFn: () => api.onboarding.analyze(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (res.inferredSkillsCount > 0) {
        toast.success("GitHub stack detected", {
          description: `Pre-filled ${res.inferredSkillsCount} technologies from ${res.repositoriesAnalyzed} public repositories.`,
        });
      }
    },
  });
  const { mutate: triggerAnalyze } = analyzeMutation;

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || autoScannedRef.current) return;
    const hasConfirmed = Boolean(profile.skills && profile.skills.length > 0);
    const hasInferred = Boolean(profile.inferred_skills && profile.inferred_skills.length > 0);
    if (profile.is_github && !hasConfirmed && !hasInferred) {
      autoScannedRef.current = true;
      triggerAnalyze();
    }
  }, [profileQuery.data, triggerAnalyze]);

  const saveMutation = useMutation({
    mutationFn: async (data: CalibrationData) => {
      const baseTechs = [
        "TypeScript",
        "JavaScript",
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
      const inferredNames = (profileQuery.data?.inferred_skills ?? [])
        .map((s) => s.name)
        .filter(Boolean);
      const allKnownTechs = Array.from(new Set([...baseTechs, ...inferredNames]));
      const activeLower = new Set(Object.keys(data.stack).map((k) => k.toLowerCase()));
      // Any technology from the deck or inferred scan that is not in the active stack is explicitly dismissed
      const dismissed = allKnownTechs.filter((t) => !activeLower.has(t.toLowerCase()));

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
        {sessionQuery.isPending || (sessionQuery.isSuccess && !sessionQuery.data) ? (
          <LoadingState rows={2} label="Checking session" />
        ) : sessionQuery.isError ? (
          <ErrorState error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />
        ) : profileQuery.isError ? (
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

            {profileQuery.data?.is_github && (
              <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <span className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 shrink-0">
                    <GitBranch className="size-3.5" />
                  </span>
                  {analyzeMutation.isPending ? (
                    <span>
                      Scanning your public GitHub repositories &amp; dependency manifests...
                    </span>
                  ) : analyzeMutation.isError ? (
                    <span className="text-rose-700">
                      GitHub repo scan could not complete automatically. Select your stack below or
                      retry.
                    </span>
                  ) : profileQuery.data.inferred_skills &&
                    profileQuery.data.inferred_skills.length > 0 ? (
                    <span>
                      Detected{" "}
                      <strong className="font-mono text-slate-900">
                        {profileQuery.data.inferred_skills.length}
                      </strong>{" "}
                      technologies from{" "}
                      <strong className="font-mono text-slate-900">
                        {profileQuery.data.repos_analyzed ??
                          analyzeMutation.data?.repositoriesAnalyzed ??
                          0}
                      </strong>{" "}
                      public GitHub repositories.
                    </span>
                  ) : (
                    <span>
                      No languages auto-detected from public non-fork GitHub repositories. Pick your
                      technologies in Step 2.
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate()}
                  className="h-7 border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 active:scale-[0.98]"
                >
                  <RefreshCw
                    className={`size-3 mr-1.5 ${analyzeMutation.isPending ? "animate-spin" : ""}`}
                  />
                  {analyzeMutation.isPending ? "Scanning..." : "Re-scan GitHub"}
                </Button>
              </div>
            )}

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
