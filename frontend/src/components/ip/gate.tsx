import { useEffect, type ReactNode } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import type { Role } from "@/lib/api";
import { AppShell } from "./app-shell";
import { EmptyState, ErrorState, LoadingState } from "./states";

/**
 * UI-only gate. Real authorization is enforced by the backend on every request;
 * this just avoids showing screens the user can't use.
 */
export function GatedLayout({
  role,
  deniedTitle,
  deniedHint,
}: {
  role?: Role;
  deniedTitle?: string;
  deniedHint?: ReactNode;
}) {
  const q = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const onUnauthorized = () => {
      qc.setQueryData(["session"], null);
      qc.removeQueries({ queryKey: ["profile"] });
      navigate({ to: "/login", replace: true });
    };
    window.addEventListener("issuepilot:unauthorized", onUnauthorized);
    return () => window.removeEventListener("issuepilot:unauthorized", onUnauthorized);
  }, [qc, navigate]);

  useEffect(() => {
    if (q.isSuccess && !q.data) navigate({ to: "/login", replace: true });
  }, [q.isSuccess, q.data, navigate]);

  if (q.isPending || (q.isSuccess && !q.data))
    return (
      <div className="mx-auto max-w-3xl p-8">
        <LoadingState rows={2} label="Checking session" />
      </div>
    );
  if (q.isError)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );

  const session = q.data!;
  return (
    <AppShell session={session}>
      {role && !session.roles.includes(role) ? (
        <EmptyState title={deniedTitle ?? "Not available"} hint={deniedHint} />
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
