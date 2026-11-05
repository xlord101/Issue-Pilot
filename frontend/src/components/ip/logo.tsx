import { Link } from "@tanstack/react-router";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 ${className ?? ""}`}
      title="Issue Pilot"
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white font-mono text-xs font-bold shadow-xs shrink-0"
      >
        IP
      </span>
      {!compact && (
        <span className="text-base tracking-tight font-bold text-slate-900 truncate">
          Issue Pilot
        </span>
      )}
    </Link>
  );
}
