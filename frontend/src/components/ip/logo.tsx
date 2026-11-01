import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden className="grid size-6 place-items-center rounded-sm border border-primary/60 font-mono text-[11px] text-primary">IP</span>
      <span>Issue Pilot</span>
    </Link>
  );
}
