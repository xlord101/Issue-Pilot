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
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      <header className="flex h-16 items-center border-b border-white/10 bg-slate-950/60 px-5 sm:px-8 backdrop-blur-xl specular-top">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 p-8 sm:p-10 backdrop-blur-2xl specular-top shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sign In to Issue Pilot
            </h1>
            <p className="text-sm text-slate-400">
              We inspect your public repositories to derive your verified capability rating and stack proficiency.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-2 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="size-4" />
              <span className="font-semibold">Security &amp; Privacy Guarantees:</span>
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
              <li>Strictly read-only OAuth permission</li>
              <li>No access to private repositories or internal code</li>
              <li>Zero automated pull request creation</li>
            </ul>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 active:scale-[0.98] shadow-lg shadow-primary/20"
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
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
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
            <p role="alert" className="text-center text-xs text-rose-400">
              {err instanceof Error ? err.message : "Sign-in initialization failed."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
