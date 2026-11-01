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
        <div key={i} className="rounded-md border bg-card p-4">
          <Skeleton className="h-4 w-2/3 bg-surface-2" />
          <Skeleton className="mt-3 h-3 w-1/3 bg-surface-2" />
          <Skeleton className="mt-4 h-3 w-full bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

function Frame({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return <Frame icon={<Inbox className="size-6" />} title={title} action={action}>{hint}</Frame>;
}

export function NotConnectedState({ name, contract }: { name: string; contract?: string }) {
  return (
    <Frame icon={<PlugZap className="size-6" />} title="Not connected yet">
      <p>
        The backend endpoint <code className="rounded bg-surface-2 px-1 font-mono text-xs text-foreground">{name}</code> isn't available. Nothing here is simulated.
      </p>
      {contract && <p className="mt-2 font-mono text-xs">Expected: {contract}</p>}
    </Frame>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof NotConnectedError) return <NotConnectedState name={error.endpointName} />;
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <Frame
      icon={<AlertTriangle className="size-6 text-destructive" />}
      title="Couldn't load this"
      action={onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="size-3.5" />Retry</Button>}
    >
      {msg}
    </Frame>
  );
}

/** Renders loading / error / empty / data for any query. */
export function QueryState<T>({
  query, isEmpty, empty, loadingRows, children,
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

export function PageHeader({ title, description, actions, badge }: { title: string; description?: ReactNode; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
