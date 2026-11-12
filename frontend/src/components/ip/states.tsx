import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  AlertTriangle,
  Inbox,
  PlugZap,
  RotateCw,
  ServerCrash,
  WifiOff,
  ShieldAlert,
  Terminal,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, NotConnectedError } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LoadingState({
  rows = 3,
  label = "Loading",
}: {
  rows?: number | undefined;
  label?: string | undefined;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <Skeleton className="h-4 w-2/3 bg-slate-100" />
          <Skeleton className="mt-3 h-3 w-1/3 bg-slate-100" />
          <Skeleton className="mt-4 h-3 w-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function Frame({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-xs">
      <div className="mb-3 text-slate-400">{icon}</div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {children && (
        <div className="mt-1 max-w-md text-sm text-slate-600 leading-relaxed">{children}</div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Frame icon={<Inbox className="size-8" />} title={title} action={action}>
      {hint}
    </Frame>
  );
}

export function NotConnectedState({ name, contract }: { name: string; contract?: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
        <PlugZap className="size-6" />
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/70 px-3 py-1 font-mono text-xs font-semibold uppercase text-amber-800">
        Backend Endpoint Disconnected
      </div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">Endpoint Not Connected</h3>
      <p className="mt-1.5 max-w-md mx-auto text-sm text-slate-600 leading-relaxed">
        The required backend contract for{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-amber-900 font-semibold border border-amber-200">
          {name}
        </code>{" "}
        is currently not routed.
      </p>
      {contract && (
        <div className="mt-4 inline-block rounded-lg border border-amber-200/80 bg-white px-3 py-1.5 font-mono text-xs text-slate-700">
          Target API Contract: <span className="font-semibold text-amber-900">{contract}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Custom Error Screen with explicit HTTP error codes, failed endpoint details,
 * and actionable recovery diagnostics. Never shows mock data on failure.
 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  if (error instanceof NotConnectedError) {
    return <NotConnectedState name={error.endpointName} />;
  }

  const isApiError = error instanceof ApiError;
  const status = isApiError ? error.status : 500;
  const statusText = isApiError ? error.statusText : "APPLICATION ERROR";
  const endpoint = isApiError ? error.endpoint : undefined;
  const method = isApiError ? error.method : undefined;
  const rawMessage =
    error instanceof Error ? error.message : "An unexpected system error occurred.";

  // Classify failure category
  const isConnectionRefused = status === 0;
  const isServerUnavailable = status === 503 || status === 502 || status === 504;
  const isAuthError = status === 401 || status === 403;

  let title = "System Error";
  let hint = "The application encountered an error while communicating with the backend.";

  if (isConnectionRefused) {
    title = "Backend Service Offline";
    hint =
      "Could not connect to the Issue Pilot Spring Boot backend on http://localhost:8000. Ensure the server process is started and listening.";
  } else if (isServerUnavailable) {
    title = "Backend Service Unavailable";
    hint =
      "The server is running, but downstream database (MongoDB Atlas) or C++ ranking service is temporarily unreachable.";
  } else if (isAuthError) {
    title = status === 401 ? "Authentication Required or Expired" : "Access Denied";
    hint =
      "Your session token has expired, is invalid, or lacks sufficient permissions for this operation.";
  } else if (status === 404) {
    title = "Resource Not Found";
    hint = "The requested backend resource or endpoint could not be found on the server.";
  }

  const badgeColor =
    isConnectionRefused || status >= 500
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : isAuthError
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  const icon = isConnectionRefused ? (
    <WifiOff className="size-6 text-rose-600" />
  ) : isServerUnavailable ? (
    <ServerCrash className="size-6 text-rose-600" />
  ) : isAuthError ? (
    <ShieldAlert className="size-6 text-amber-600" />
  ) : (
    <AlertTriangle className="size-6 text-rose-600" />
  );

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-md shadow-slate-900/5 text-left",
        compact ? "py-5" : "",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-bold",
                  badgeColor,
                )}
              >
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                {statusText}
              </span>
              {endpoint && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 border border-slate-200">
                  <Terminal className="size-3 text-slate-400" />
                  {method ? `${method} ` : ""}
                  {endpoint}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">{hint}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 active:scale-[0.98] shadow-xs"
            >
              <RotateCw className="size-3.5 mr-1.5" />
              Retry Request
            </Button>
          )}
          {isAuthError && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 active:scale-[0.98]"
            >
              <Link to="/login">
                <LogIn className="size-3.5 mr-1.5 text-blue-600" />
                Sign In Again
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Diagnostic details box */}
      <div className="mt-5 rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 font-mono text-xs text-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200/70 pb-1.5">
          <span>Diagnostic Log &amp; Server Response</span>
          <span>HTTP Code: {status}</span>
        </div>
        <div className="text-slate-700 break-all leading-relaxed whitespace-pre-wrap">
          {rawMessage}
        </div>
        {isConnectionRefused && (
          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/70 leading-normal">
            <strong>Troubleshooting:</strong> Run{" "}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-bold">
              mvn spring-boot:run
            </code>{" "}
            or check that port 8000 is listening.
          </div>
        )}
        {isServerUnavailable && (
          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/70 leading-normal">
            <strong>Troubleshooting:</strong> Verify MongoDB Atlas connection credentials, IP
            whitelist, and network reachability.
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders loading / error / empty / data for any query. */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  loadingRows,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (d: T) => boolean;
  empty?: ReactNode;
  loadingRows?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <LoadingState rows={loadingRows} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && <div className="text-sm text-slate-600 max-w-2xl">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
