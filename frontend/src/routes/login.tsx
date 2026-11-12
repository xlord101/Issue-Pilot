import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { NotConnectedState } from "@/components/ip/states";
import { api, ApiError, NotConnectedError } from "@/lib/api";
import { pageMeta } from "@/lib/format";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () =>
    pageMeta(
      "Sign In or Register — Issue Pilot",
      "Connect your developer identity to find calibrated open-source issues.",
    ),
  component: AuthPage,
});

type AuthMode = "register" | "login" | "verify-otp" | "forgot-password" | "reset-password";

function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [mode, setMode] = useState<AuthMode>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function switchMode(nextMode: AuthMode) {
    setErr(null);
    setOtp("");
    setMode(nextMode);
  }

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

  async function handleResendOtp() {
    if (!email || resendCooldown > 0 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const challenge = await api.auth.resendOtp({ email });
      setResendCooldown(challenge.resend_cooldown_seconds || 60);
      toast.success("Verification code resent", {
        description: `Check ${challenge.email} for your 6-digit verification code.`,
      });
    } catch (error) {
      setErr(error);
      toast.error(error instanceof Error ? error.message : "Could not resend verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (mode === "register") {
      if (!email || !password) {
        toast.error("Please enter your email and password.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (!agreedToTerms) {
        toast.error("You must agree to the Terms & Conditions.");
        return;
      }

      setBusy(true);
      try {
        const challenge = await api.auth.register({
          firstName,
          lastName,
          email,
          password,
        });
        setEmail(challenge.email || email.trim().toLowerCase());
        setResendCooldown(challenge.resend_cooldown_seconds || 60);
        setOtp("");
        setMode("verify-otp");
        toast.success("Verification code sent", {
          description: `Enter the 6-digit code sent to ${challenge.email || email}.`,
        });
      } catch (error) {
        setErr(error);
        toast.error(error instanceof Error ? error.message : "Registration failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "login") {
      if (!email || !password) {
        toast.error("Please enter your email and password.");
        return;
      }

      setBusy(true);
      try {
        const session = await api.auth.signInWithPassword({
          email,
          password,
        });
        qc.setQueryData(["session"], session);
        toast.success("Signed in successfully!");
        if (session.onboarding_completed) {
          navigate({ to: "/app/feed" });
        } else {
          navigate({ to: "/onboarding" });
        }
      } catch (error) {
        const details =
          error instanceof ApiError ? (error.details as Record<string, unknown> | null) : null;
        if (
          error instanceof ApiError &&
          error.status === 403 &&
          details?.["code"] === "EMAIL_NOT_VERIFIED"
        ) {
          const targetEmail =
            typeof details?.["email"] === "string" ? details["email"] : email.trim().toLowerCase();
          setEmail(targetEmail);
          setOtp("");
          setMode("verify-otp");
          toast.info("Email verification required", {
            description: "Enter your 6-digit verification code or request a new one.",
          });
          setBusy(false);
          return;
        }
        setErr(error);
        toast.error(error instanceof Error ? error.message : "Sign in failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "verify-otp") {
      const cleanOtp = otp.trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        toast.error("Please enter the 6-digit verification code.");
        return;
      }

      setBusy(true);
      try {
        const session = await api.auth.verifyOtp({ email, otp: cleanOtp });
        qc.setQueryData(["session"], session);
        toast.success("Email verified! Let's calibrate your profile.");
        navigate({ to: "/onboarding" });
      } catch (error) {
        setErr(error);
        toast.error(error instanceof Error ? error.message : "Invalid verification code.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "forgot-password") {
      if (!email) {
        toast.error("Please enter your registered email address.");
        return;
      }

      setBusy(true);
      try {
        const res = await api.auth.forgotPassword({ email });
        setResendCooldown(res.resend_cooldown_seconds || 60);
        setOtp("");
        setNewPassword("");
        setMode("reset-password");
        toast.success("Reset code sent", {
          description: res.message,
        });
      } catch (error) {
        setErr(error);
        toast.error(error instanceof Error ? error.message : "Could not send password reset code.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "reset-password") {
      const cleanOtp = otp.trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        toast.error("Please enter the 6-digit verification code.");
        return;
      }
      if (newPassword.length < 8) {
        toast.error("New password must be at least 8 characters.");
        return;
      }

      setBusy(true);
      try {
        const res = await api.auth.resetPassword({
          email,
          otp: cleanOtp,
          newPassword,
        });
        toast.success(res.message || "Password updated successfully.");
        setPassword("");
        setNewPassword("");
        setOtp("");
        setMode("login");
      } catch (error) {
        setErr(error);
        toast.error(error instanceof Error ? error.message : "Password reset failed.");
      } finally {
        setBusy(false);
      }
    }
  }

  const diagnosticError = err instanceof ApiError ? err : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-blue-600 selection:text-white antialiased relative overflow-hidden">
      {/* Outer Card with subtle border and crisp elevation */}
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/5 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative z-10">
        {/* Specular top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />

        {/* ======================================================== */}
        {/* LEFT PANEL: Luminous Editorial Hero Card                 */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 p-3 sm:p-4 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden min-h-[400px] sm:min-h-[540px] flex-1 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-[#ebedf8] via-[#f1f3fa] to-[#e4e8f4] border border-slate-200/80 shadow-inner">
            <svg
              className="absolute inset-0 size-full pointer-events-none select-none opacity-80"
              preserveAspectRatio="none"
              viewBox="0 0 400 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="400" height="600" fill="url(#lightSkyGradient)" />
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

            {/* Bottom Hero Typography */}
            <div className="relative z-10 space-y-4 pt-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
                Matching Developers
                <br />
                to Real-World Code
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs font-normal">
                Continuous unclaimed issue indexing across GitHub, GitLab, Codeberg, and Bugzilla.
              </p>

              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-6 rounded-full bg-blue-600 shadow-xs" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Auth Form                                   */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Title & Mode Navigation */}
            <div className="space-y-1.5">
              {(mode === "verify-otp" ||
                mode === "forgot-password" ||
                mode === "reset-password") && (
                <button
                  type="button"
                  onClick={() => switchMode(mode === "verify-otp" ? "register" : "login")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to {mode === "verify-otp" ? "sign up" : "log in"}
                </button>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {mode === "register" && "Create an account"}
                {mode === "login" && "Welcome back"}
                {mode === "verify-otp" && "Verify your email"}
                {mode === "forgot-password" && "Reset your password"}
                {mode === "reset-password" && "Enter reset code"}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600">
                {mode === "register" && (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Log in
                    </button>
                  </>
                )}
                {mode === "login" && (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                )}
                {mode === "verify-otp" && (
                  <>
                    We sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-slate-900">{email}</span>.
                  </>
                )}
                {mode === "forgot-password" &&
                  "Enter your registered email address and we will send a 6-digit reset code."}
                {mode === "reset-password" && (
                  <>
                    Enter the 6-digit code sent to{" "}
                    <span className="font-semibold text-slate-900">{email}</span> and choose a new
                    password.
                  </>
                )}
              </p>
            </div>

            {/* Real Backend Error Banner (never swallowed or mocked) */}
            {diagnosticError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-left space-y-1"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-red-600 shrink-0" />
                  <span className="font-mono text-[11px] font-semibold text-red-700 uppercase tracking-wider">
                    {diagnosticError.statusText}
                  </span>
                </div>
                <p className="text-xs text-red-700 leading-relaxed pl-6">
                  {diagnosticError.message}
                </p>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      First name
                    </label>
                    <Input
                      type="text"
                      placeholder="Ada"
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
                      placeholder="Lovelace"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                    />
                  </div>
                </div>
              )}

              {(mode === "register" || mode === "login" || mode === "forgot-password") && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                  />
                </div>
              )}

              {(mode === "register" || mode === "login") && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">Password</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot-password")}
                        className="text-[11px] text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "register" ? "At least 8 characters" : "Enter your password"
                      }
                      required
                      minLength={mode === "register" ? 8 : undefined}
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
              )}

              {(mode === "verify-otp" || mode === "reset-password") && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <MailCheck className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-12 pl-10 pr-4 font-mono text-lg tracking-[0.35em] text-center bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === "reset-password" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
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
              )}

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
                {busy
                  ? "Processing..."
                  : mode === "register"
                    ? "Create account"
                    : mode === "login"
                      ? "Sign in"
                      : mode === "verify-otp"
                        ? "Verify email & continue"
                        : mode === "forgot-password"
                          ? "Send reset code"
                          : "Update password"}
              </Button>

              {mode === "verify-otp" && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500">Didn&apos;t receive the code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || busy}
                    onClick={handleResendOtp}
                    className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend verification code"}
                  </button>
                </div>
              )}
            </form>

            {(mode === "register" || mode === "login") && (
              <>
                {/* Divider */}
                <div className="relative flex items-center justify-center pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {mode === "register" ? "Or register with" : "Or continue with"}
                  </span>
                </div>

                {/* GitHub OAuth (Primary Developer Identity) */}
                <button
                  type="button"
                  onClick={handleGitHubSignIn}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 h-11 px-4 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] shadow-xs hover:border-slate-300 cursor-pointer"
                >
                  <GitHubMark className="size-4 text-slate-900" />
                  <span>Continue with GitHub</span>
                </button>
              </>
            )}

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
