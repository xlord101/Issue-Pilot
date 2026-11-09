import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubMark, GitLabMark, CodebergMark, BugzillaMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { NotConnectedState } from "@/components/ip/states";
import { api, NotConnectedError } from "@/lib/api";
import { pageMeta } from "@/lib/format";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () =>
    pageMeta(
      "Sign In or Register — Issue Pilot",
      "Connect your developer identity to find calibrated open-source issues.",
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
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-blue-600 selection:text-white antialiased relative overflow-hidden">
      {/* Soft Luminous Aurora Ambient Backdrop */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#cfbee5]/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#abc0ef]/35 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-[#a2d3f4]/35 blur-3xl pointer-events-none" />

      {/* Outer Card with subtle border and crisp elevation */}
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/5 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative z-10">
        {/* Specular top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />

        {/* ======================================================== */}
        {/* LEFT PANEL: Luminous Pastel Hero Card                    */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 p-3 sm:p-4 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden min-h-[440px] sm:min-h-[560px] flex-1 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-[#ebedf8] via-[#f1f3fa] to-[#ede7f6] border border-slate-200/80 shadow-inner">
            {/* Soft Luminous Vector Art */}
            <svg
              className="absolute inset-0 size-full pointer-events-none select-none opacity-80"
              preserveAspectRatio="none"
              viewBox="0 0 400 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Luminous Pastel Sky Gradient */}
              <rect width="400" height="600" fill="url(#lightSkyGradient)" />
              {/* Subtle Glowing Pastel Light Sources */}
              <circle cx="300" cy="140" r="150" fill="#cfbee5" opacity="0.6" filter="blur(60px)" />
              <circle cx="90" cy="240" r="160" fill="#abc0ef" opacity="0.5" filter="blur(70px)" />
              <circle cx="200" cy="420" r="140" fill="#a2d3f4" opacity="0.45" filter="blur(60px)" />

              {/* Gentle Sculpted Landscape Ridges in Pastel Slate */}
              <path
                d="M-20 370 Q110 320 220 345 T420 310 L420 600 L-20 600 Z"
                fill="#d8dceb"
                opacity="0.65"
              />
              <path
                d="M-20 420 Q120 365 260 415 T420 375 L420 600 L-20 600 Z"
                fill="#ccd2e4"
                opacity="0.75"
              />
              <path
                d="M-20 480 Q140 435 290 500 T420 460 L420 600 L-20 600 Z"
                fill="#c0c7dc"
                opacity="0.85"
              />

              <defs>
                <linearGradient
                  id="lightSkyGradient"
                  x1="200"
                  y1="0"
                  x2="200"
                  y2="600"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#f4f6fc" />
                  <stop offset="0.4" stopColor="#ebedf8" />
                  <stop offset="0.8" stopColor="#e4e8f4" />
                  <stop offset="1" stopColor="#dce1ee" />
                </linearGradient>
              </defs>
            </svg>

            {/* Top Bar inside Left Visual Card */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Logo compact className="size-8" />
                <span className="font-bold text-base tracking-tight text-slate-900">
                  Issue Pilot
                </span>
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 transition-all shadow-xs active:scale-[0.98] backdrop-blur-md"
              >
                Back to website &rarr;
              </Link>
            </div>

            {/* Bottom Hero Typography & Slide Indicators */}
            <div className="relative z-10 space-y-4 pt-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
                Matching Developers
                <br />
                to Real-World Code
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs font-normal">
                Continuous unclaimed issue indexing across GitHub, GitLab, Codeberg, and Bugzilla.
              </p>

              {/* 3 Pagination Indicator Dots */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-6 rounded-full bg-blue-600 shadow-xs" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
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
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {mode === "register" ? "Create an account" : "Welcome back"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                {mode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
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
                      className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
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
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      First name
                    </label>
                    <Input
                      type="text"
                      placeholder="Fletcher"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Last name
                    </label>
                    <Input
                      type="text"
                      placeholder="Shears"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                <Input
                  type="email"
                  placeholder="fletcher@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Password reset", {
                          description:
                            "Please check your registered email for password reset instructions.",
                        })
                      }
                      className="text-[11px] text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
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
                    className="h-11 pr-10 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600">
                    I agree to the{" "}
                    <Link
                      to="/"
                      className="text-slate-800 underline underline-offset-2 hover:text-blue-600 font-medium"
                    >
                      Terms &amp; Conditions
                    </Link>
                  </span>
                </label>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-blue-500/20 text-sm cursor-pointer"
              >
                {busy ? "Processing..." : mode === "register" ? "Create account" : "Sign in"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 p-2.5 text-xs font-semibold transition-all active:scale-[0.98] shadow-xs hover:border-slate-300 cursor-pointer"
              >
                <GitHubMark className="size-4 text-slate-900" />
                <span>GitHub</span>
              </button>

              {/* 2. GitLab (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("GitLab")}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 p-2.5 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GitLabMark className="size-4" />
                  <span>GitLab</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                  Soon
                </span>
              </button>

              {/* 3. Codeberg (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("Codeberg")}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 p-2.5 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CodebergMark className="size-4" />
                  <span>Codeberg</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                  Soon
                </span>
              </button>

              {/* 4. Bugzilla (Coming Soon) */}
              <button
                type="button"
                onClick={() => handleProviderComingSoon("Bugzilla")}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 p-2.5 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BugzillaMark className="size-4" />
                  <span>Bugzilla</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
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
