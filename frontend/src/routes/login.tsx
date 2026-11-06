import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GitHubMark,
  GitLabMark,
  CodebergMark,
  BugzillaMark,
} from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { NotConnectedState } from "@/components/ip/states";
import { api, NotConnectedError } from "@/lib/api";
import { pageMeta } from "@/lib/format";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () =>
    pageMeta(
      "Sign In or Register — Issue Pilot",
      "Connect your developer identity to find calibrated open-source issues."
    ),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  async function handleGitHubSignIn() {
    setBusy(true);
    setErr(null);
    try {
      await api.auth.startSignIn();
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (mode === "register" && !agreedToTerms) {
      toast.error("You must agree to the Terms & Conditions.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      if (mode === "register") {
        await api.auth.register({
          firstName,
          lastName,
          email,
          password,
        });
        toast.success("Account created successfully!");
        navigate({ to: "/onboarding" });
      } else {
        await api.auth.signInWithPassword({
          email,
          password,
        });
        toast.success("Signed in successfully!");
        navigate({ to: "/app/feed" });
      }
    } catch (error) {
      setErr(error);
      toast.error(
        error instanceof Error ? error.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleProviderComingSoon(providerName: string) {
    toast.info(`${providerName} integration coming soon`, {
      description: `Direct OAuth for ${providerName} is scheduled in an upcoming release. Please continue with GitHub or standard email registration.`,
    });
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-indigo-600 selection:text-white antialiased">
      {/* Outer Card with spec border and specular highlight */}
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0d121f]/90 shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
        {/* Specular top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* ======================================================== */}
        {/* LEFT PANEL: Atmospheric Dune Landscape Hero Card         */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 p-3 sm:p-4 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden min-h-[460px] sm:min-h-[580px] flex-1 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#211b44] via-[#14152e] to-[#0a0d18] border border-white/10 shadow-inner">
            {/* Atmospheric SVG Dune and Night Sky Art */}
            <svg
              className="absolute inset-0 size-full pointer-events-none select-none opacity-85"
              preserveAspectRatio="none"
              viewBox="0 0 400 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Starry Night Sky Gradient */}
              <rect width="400" height="600" fill="url(#skyGradient)" />
              {/* Distant Atmospheric Nebula Glow */}
              <circle cx="280" cy="120" r="140" fill="#7c3aed" opacity="0.25" filter="blur(60px)" />
              <circle cx="100" cy="240" r="160" fill="#2563eb" opacity="0.2" filter="blur(70px)" />

              {/* Twinkling Star Points */}
              <circle cx="45" cy="40" r="1" fill="#ffffff" opacity="0.8" />
              <circle cx="120" cy="80" r="1" fill="#ffffff" opacity="0.6" />
              <circle cx="210" cy="50" r="1.5" fill="#ffffff" opacity="0.9" />
              <circle cx="340" cy="90" r="1" fill="#ffffff" opacity="0.7" />
              <circle cx="70" cy="140" r="1" fill="#ffffff" opacity="0.5" />
              <circle cx="160" cy="180" r="1" fill="#ffffff" opacity="0.75" />
              <circle cx="290" cy="170" r="1.5" fill="#ffffff" opacity="0.85" />
              <circle cx="370" cy="130" r="1" fill="#ffffff" opacity="0.6" />
              <circle cx="230" cy="220" r="1" fill="#ffffff" opacity="0.7" />

              {/* Soft Distant Mountain Ridge */}
              <path
                d="M-20 380 Q100 320 220 345 T420 310 L420 600 L-20 600 Z"
                fill="#161533"
                opacity="0.9"
              />
              {/* Midground Velvet Dune */}
              <path
                d="M-20 420 Q120 360 260 410 T420 370 L420 600 L-20 600 Z"
                fill="#1c193f"
              />
              {/* Foreground Sculpted Shadow Dune */}
              <path
                d="M-20 480 Q140 430 290 500 T420 460 L420 600 L-20 600 Z"
                fill="#101124"
              />

              <defs>
                <linearGradient id="skyGradient" x1="200" y1="0" x2="200" y2="600" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#312563" />
                  <stop offset="0.4" stopColor="#1b173c" />
                  <stop offset="0.8" stopColor="#0d0e1e" />
                  <stop offset="1" stopColor="#080a14" />
                </linearGradient>
              </defs>
            </svg>

            {/* Top Bar inside Left Visual Card */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <Link to="/" className="flex items-center gap-2 text-white">
                <Logo compact className="size-8" />
                <span className="font-bold text-base tracking-tight text-white">
                  Issue Pilot
                </span>
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-white/90 hover:bg-white/20 transition-all active:scale-[0.98] backdrop-blur-md"
              >
                Back to website &rarr;
              </Link>
            </div>

            {/* Bottom Hero Typography & Slide Indicators */}
            <div className="relative z-10 space-y-5 pt-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
                Matching Developers
                <br />
                to Real-World Code
              </h2>

              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-xs font-normal">
                Continuous unclaimed issue indexing across GitHub, GitLab, Codeberg, and Bugzilla.
              </p>

              {/* 3 Pagination Indicator Dots */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-6 rounded-full bg-white shadow-xs" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Auth Form (Register / Login Switchable)     */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Title & Toggle Switcher */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {mode === "register" ? "Create an account" : "Welcome back"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {mode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors"
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      First name
                    </label>
                    <Input
                      type="text"
                      placeholder="Fletcher"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Last name
                    </label>
                    <Input
                      type="text"
                      placeholder="Shears"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="fletcher@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Password reset", {
                          description: "Please check your registered email for password reset instructions.",
                        })
                      }
                      className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="size-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">
                    I agree to the{" "}
                    <Link
                      to="/"
                      className="text-slate-300 underline underline-offset-2 hover:text-white"
                    >
                      Terms &amp; Conditions
                    </Link>
                  </span>
                </label>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-indigo-600/25 text-sm"
              >
                {busy
                  ? "Processing..."
                  : mode === "register"
                  ? "Create account"
                  : "Sign in"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#0d121f] px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {mode === "register" ? "Or register with" : "Or continue with"}
              </span>
            </div>

            {/* 4 Social Platform Buttons: GitHub, GitLab, Codeberg, Bugzilla */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* 1. GitHub (Fully Functional) */}
              <button
                type="button"
                onClick={handleGitHubSignIn}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-white p-2.5 text-xs font-semibold transition-all active:scale-[0.98]"
              >
                <GitHubMark className="size-4 text-white" />
                <span>GitHub</span>
              </button>

              {/* 2. GitLab (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("GitLab")}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 p-2.5 text-xs font-medium transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <GitLabMark className="size-4" />
                  <span>GitLab</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  Soon
                </span>
              </button>

              {/* 3. Codeberg (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("Codeberg")}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 p-2.5 text-xs font-medium transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <CodebergMark className="size-4" />
                  <span>Codeberg</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  Soon
                </span>
              </button>

              {/* 4. Bugzilla (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("Bugzilla")}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 p-2.5 text-xs font-medium transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <BugzillaMark className="size-4" />
                  <span>Bugzilla</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  Soon
                </span>
              </button>
            </div>

            {err instanceof NotConnectedError && (
              <div className="mt-4">
                <NotConnectedState
                  name={err.endpointName}
                  contract="GET /api/auth/github/login → 302 to GitHub"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
