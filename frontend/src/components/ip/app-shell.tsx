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
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Core Surfaces
      </div>
      <ul className="space-y-1">
        {CORE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact ?? false }}
              className="group flex flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2.5 text-slate-600 transition-all duration-140 hover:border-slate-200 hover:bg-slate-100/70 active:scale-[0.98]"
              activeProps={{
                className: "!border-blue-200 !bg-blue-50/80 !text-blue-700 font-semibold shadow-xs",
              }}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="size-4 shrink-0 text-slate-500 group-hover:text-slate-900 group-data-[status=active]:text-blue-700 transition-colors" aria-hidden />
                <span className="text-sm font-medium tracking-tight text-slate-900">{item.label}</span>
              </div>
              <span className="pl-6.5 text-[11px] text-slate-500 line-clamp-1">
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
    <div className="flex h-full flex-col bg-white border-r border-slate-200/90 shadow-xs">
      <div className="flex h-16 items-center border-b border-slate-200/80 px-5">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Nav onNavigate={() => setOpen(false)} />
      </div>

      <div className="border-t border-slate-200/80 p-4 bg-slate-50/70">
        <div className="rounded-lg border border-slate-200/90 bg-white p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Cpu className="size-3 text-emerald-600" />
              Engine
            </span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              C++ Core &bull; &lt;2ms
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Database className="size-3 text-blue-600" />
              Candidates
            </span>
            <span className="text-slate-700 font-medium">Atlas Pool</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          Grounded 6-factor issue recommendation. Actions commit on source platforms.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block z-30">
        {sidebar}
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-white p-0 border-r border-slate-200">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/90 bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-600 hover:text-slate-900"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-slate-700 font-medium">C++ 6-Factor Engine Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs text-slate-700">
              <span className="font-medium text-slate-500">Capability:</span>
              <span className="font-mono font-bold text-blue-700">76/100</span>
              <Link
                to="/onboarding"
                className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
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
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              )}
            >
              {USE_MOCK_API ? "Standby Mode" : "Live Backend"}
            </span>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>{session.user.login}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs h-8 active:scale-[0.98]"
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
