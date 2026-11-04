import { Link } from "@tanstack/react-router";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 ${className ?? ""}`}>
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white font-mono text-xs font-bold shadow-xs">
        IP
      </span>
      <span className="text-base tracking-tight font-bold text-slate-900">Issue Pilot</span>
    </Link>
  );
}
