import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ip/logo";
import { NotConnectedState } from "@/components/ip/states";
import { api, NotConnectedError } from "@/lib/api";
import { pageMeta } from "@/lib/format";

const search = z.object({ status: z.coerce.string().optional(), error: z.coerce.string().optional() });

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ ...pageMeta("Completing sign-in", "Finishing your GitHub sign-in."), }),
  component: Callback,
});

function Callback() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["auth-callback", s.status, s.error],
    queryFn: () => api.auth.completeCallback({ status: s.status, error: s.error }),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (q.isSuccess) {
      qc.setQueryData(["session"], q.data);
      const t = setTimeout(() => navigate({ to: "/onboarding", replace: true }), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [q.isSuccess, q.data, qc, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center border-b px-4 sm:px-6"><Logo /></header>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm text-center" aria-live="polite">
          {q.isPending && (
            <>
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <h1 className="mt-4 text-lg font-semibold">Completing sign-in…</h1>
              <p className="mt-1 text-sm text-muted-foreground">Confirming your session with Issue Pilot.</p>
            </>
          )}
          {q.isSuccess && (
            <>
              <CheckCircle2 className="mx-auto size-8 text-success" />
              <h1 className="mt-4 text-lg font-semibold">Signed in as {q.data.user.login}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Taking you to profile setup…</p>
              <Button asChild variant="outline" className="mt-5"><Link to="/onboarding">Continue</Link></Button>
            </>
          )}
          {q.isError && (q.error instanceof NotConnectedError ? (
            <NotConnectedState name={q.error.endpointName} contract="GET /auth/me → Session (reads httpOnly cookie)" />
          ) : (
            <>
              <XCircle className="mx-auto size-8 text-destructive" />
              <h1 className="mt-4 text-lg font-semibold">Sign-in didn't complete</h1>
              <p className="mt-1 text-sm text-muted-foreground">{q.error.message}</p>
              <Button asChild className="mt-5"><Link to="/login">Try again</Link></Button>
            </>
          ))}
        </div>
      </main>
    </div>
  );
}
