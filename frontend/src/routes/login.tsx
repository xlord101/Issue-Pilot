import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GitHubMark } from "@/components/ip/badges";
import { Logo } from "@/components/ip/logo";
import { NotConnectedState } from "@/components/ip/states";
import { api, NotConnectedError, USE_MOCK_API } from "@/lib/api";
import { pageMeta } from "@/lib/format";
import { ShieldCheck, Cpu, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () =>
    pageMeta(
      "Sign In to Issue Pilot",
      "Connect your GitHub profile to derive your verified contributor capability dial."
    ),
  component: LoginPage,
});

function LoginPage() {
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      await api.auth.startSignIn();
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white font-sans">
      <header className="flex h-16 items-center border-b border-slate-200/90 bg-white/80 px-5 sm:px-8 backdrop-blur-md">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-10 shadow-lg shadow-slate-900/5 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sign In to Issue Pilot
            </h1>
            <p className="text-sm text-slate-600">
              We inspect public contributions to derive your verified capability rating and stack proficiency.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-xs font-mono text-slate-700">
            <div className="flex items-center gap-2 text-blue-600">
              <ShieldCheck className="size-4" />
              <span className="font-semibold text-slate-900">Security &amp; Privacy Guarantees:</span>
            </div>
            <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
              <li>Strictly read-only OAuth permission</li>
              <li>No access to private repositories or internal code</li>
              <li>Zero automated pull request creation</li>
            </ul>
          </div>

          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold h-11 active:scale-[0.98] shadow-sm transition-all"
            size="lg"
            onClick={go}
            disabled={busy}
          >
            <GitHubMark className="mr-2" />
            {busy ? "Authorizing with GitHub…" : "Continue with GitHub"}
          </Button>

          <div className="pt-2 text-center">
            <Link
              to="/onboarding"
              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4"
            >
              Skip directly to Behavioral Calibration Flow &rarr;
            </Link>
          </div>

          {err instanceof NotConnectedError && (
            <div className="mt-4">
              <NotConnectedState
                name={err.endpointName}
                contract="GET /api/auth/github/login → 302 to GitHub"
              />
            </div>
          )}

          {err != null && !(err instanceof NotConnectedError) && (
            <p role="alert" className="text-center text-xs text-rose-600 font-medium">
              {err instanceof Error ? err.message : "Sign-in initialization failed."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
