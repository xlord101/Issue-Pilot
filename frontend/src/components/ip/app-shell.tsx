import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation, type LinkProps } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Compass, Gauge, LayoutList, LogOut, Menu, User, Cpu, Sparkles, RefreshCw, Database
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api, USE_MOCK_API, type Session } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type NavItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: typeof LayoutList;
  description: string;
  exact?: boolean;
};

const CORE_NAV_ITEMS: NavItem[] = [
  {
    to: "/app/feed",
    label: "Recommendations",
    icon: LayoutList,
    description: "Personalized 6-factor issue feed",
  },
  {
    to: "/app/simulator",
    label: "What-If Simulator",
    icon: Gauge,
    description: "Tune ranking weights in real-time",
  },
  {
    to: "/app/explore",
    label: "Explore Issues",
    icon: Compass,
    description: "Cross-platform issue intelligence",
  },
  {
    to: "/app/profile",
    label: "Tech Profile",
    icon: User,
    description: "Derived skills & capability rating",
  },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main Navigation" className="space-y-1">
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        Core Surfaces
      </div>
      <ul className="space-y-1">
        {CORE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact ?? false }}
              className="group flex flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2.5 text-sidebar-foreground transition-all duration-150 hover:border-white/5 hover:bg-sidebar-accent/60 active:scale-[0.98]"
              activeProps={{
                className: "!border-primary/30 !bg-primary/10 !text-foreground font-medium shadow-sm shadow-primary/5",
              }}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="pl-6.5 text-[11px] text-muted-foreground line-clamp-1">
                {item.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    try {
      await api.auth.signOut();
    } catch {
      /* live logout fallback */
    }
    await qc.cancelQueries();
    qc.clear();
    navigate({ to: "/login", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950/70 backdrop-blur-2xl border-r border-white/10">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Nav onNavigate={() => setOpen(false)} />
      </div>

      <div className="border-t border-white/10 p-4 bg-slate-900/30">
        <div className="rounded-lg border border-white/5 bg-slate-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Cpu className="size-3 text-emerald-400" />
              Engine
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              C++ Core &bull; &lt;2ms
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Database className="size-3 text-cyan-400" />
              Candidates
            </span>
            <span className="text-slate-300">Atlas Pool</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          Grounded 6-factor issue recommendation. Actions commit on source platforms.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 antialiased selection:bg-primary/20 selection:text-primary">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block z-30">
        {sidebar}
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-slate-950 p-0 border-r border-white/10">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl px-4 sm:px-6 specular-top">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-300 hover:text-white"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-slate-300">C++ 6-Factor Engine Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              <span className="font-medium text-amber-400">Capability:</span>
              <span className="font-mono font-semibold text-slate-100">76/100</span>
              <Link
                to="/onboarding"
                className="ml-1 text-[11px] text-primary hover:underline flex items-center gap-0.5"
                title="Recalibrate behavioral model"
              >
                <RefreshCw className="size-2.5" />
                Recalibrate
              </Link>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span
              className={cn(
                "hidden rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide sm:inline",
                USE_MOCK_API
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              )}
            >
              {USE_MOCK_API ? "Standby Mode" : "Live Backend"}
            </span>

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300 font-mono">
              <span className="size-2 rounded-full bg-slate-500" />
              <span>{session.user.login}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-white/10 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-8"
            >
              <LogOut className="size-3.5 mr-1" />
              Sign out
            </Button>
          </div>
        </header>

        <main key={pathname} className="page-enter mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
