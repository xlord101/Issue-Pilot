import { Link } from "@tanstack/react-router";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 ${className ?? ""}`}
      title="Issue Pilot"
    >
      <img src="/brand-logo.png" alt="" aria-hidden className="size-7 shrink-0 object-contain" />
      {!compact && (
        <span className="text-base tracking-tight font-bold text-slate-900 truncate">
          Issue Pilot
        </span>
      )}
    </Link>
  );
}
