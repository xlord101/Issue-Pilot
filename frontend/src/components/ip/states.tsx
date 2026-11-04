import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, Inbox, PlugZap, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotConnectedError } from "@/lib/api";

export function LoadingState({ rows = 3, label = "Loading" }: { rows?: number | undefined; label?: string | undefined }) {
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

function Frame({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-xs">
      <div className="mb-3 text-slate-400">{icon}</div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-600 leading-relaxed">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return <Frame icon={<Inbox className="size-8" />} title={title} action={action}>{hint}</Frame>;
}

export function NotConnectedState({ name, contract }: { name: string; contract?: string }) {
  return (
    <Frame icon={<PlugZap className="size-8 text-amber-500" />} title="Backend Service Not Connected">
      <p>
        The backend endpoint <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 font-semibold">{name}</code> is currently unreachable.
      </p>
      {contract && <p className="mt-2 font-mono text-xs text-slate-500">Expected: {contract}</p>}
    </Frame>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof NotConnectedError) return <NotConnectedState name={error.endpointName} />;
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <Frame
      icon={<AlertTriangle className="size-8 text-rose-500" />}
      title="Couldn't load content"
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98]">
            <RotateCw className="size-3.5 mr-1.5" />
            Retry
          </Button>
        )
      }
    >
      {msg}
    </Frame>
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