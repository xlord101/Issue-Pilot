import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ip/logo";
import { ErrorState, NotConnectedState } from "@/components/ip/states";
import { api, NotConnectedError } from "@/lib/api";
import { setStoredAuthToken } from "@/lib/api/http";
import { pageMeta } from "@/lib/format";

const search = z.object({
  status: z.coerce.string().optional(),
  error: z.coerce.string().optional(),
  exchange_code: z.coerce.string().optional(),
  new_user: z.coerce.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ ...pageMeta("Completing sign-in", "Finishing your GitHub sign-in.") }),
  component: Callback,
});

function Callback() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["auth-callback", s.status, s.error, s.exchange_code],
    queryFn: () =>
      api.auth.completeCallback({
        status: s.status,
        error: s.error,
        exchange_code: s.exchange_code,
      }),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (q.isSuccess) {
      qc.setQueryData(["session"], q.data);
      // Determine if user has already completed onboarding/calibration
      api.profile
        .me()
        .then((profile) => {
          if (
            profile &&
            (profile.onboarding_completed || (profile.skills && profile.skills.length > 0))
          ) {
            navigate({ to: "/app/feed", replace: true });
          } else if (s.new_user === "false") {
            navigate({ to: "/app/feed", replace: true });
          } else {
            navigate({ to: "/onboarding", replace: true });
          }
        })
        .catch(() => {
          if (s.new_user === "false") {
            navigate({ to: "/app/feed", replace: true });
          } else {
            navigate({ to: "/onboarding", replace: true });
          }
        });
    }
    if (q.isError) {
      setStoredAuthToken(null);
    }
    return undefined;
  }, [q.isSuccess, q.isError, q.data, qc, navigate, s.new_user]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 font-sans antialiased">
      <header className="flex h-16 items-center border-b border-slate-200/90 bg-white/80 px-5 sm:px-8 backdrop-blur-md">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-lg shadow-slate-900/5"
          aria-live="polite"
        >
          {q.isPending && (
            <div>
              <Loader2 className="mx-auto size-9 animate-spin text-blue-600" />
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Completing sign-in…
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Confirming your session with Issue Pilot.
              </p>
            </div>
          )}
          {q.isSuccess && (
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="size-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Signed in as {q.data.user.login}
              </h1>
              <p className="mt-1 text-sm text-slate-600">Taking you to profile setup…</p>
              <Button
                asChild
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-medium active:scale-[0.98]"
              >
                <Link to="/onboarding">Continue</Link>
              </Button>
            </div>
          )}
          {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        </div>
      </main>
    </div>
  );
}
