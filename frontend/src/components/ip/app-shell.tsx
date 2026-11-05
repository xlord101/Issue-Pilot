import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation, type LinkProps } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Gauge,
  LayoutList,
  LogOut,
  Menu,
  User,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api, type Session } from "@/lib/api";
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
    description: "Personalized issue feed",
  },
  {
    to: "/app/simulator",
    label: "What-If Simulator",
    icon: Gauge,
    description: "Tune weights in real-time",
  },
  {
    to: "/app/explore",
    label: "Explore Issues",
    icon: Compass,
    description: "Cross-platform intelligence",
  },
  {
    to: "/app/profile",
    label: "Tech Profile",
    icon: User,
    description: "Skills & capability rating",
  },
];

function Nav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main Navigation" className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Surfaces
        </div>
      )}
      <ul className="space-y-1">
        {CORE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                "group flex rounded-lg border border-transparent transition-all duration-140 hover:border-slate-200 hover:bg-slate-100/70 active:scale-[0.98]",
                collapsed
                  ? "size-10 items-center justify-center mx-auto"
                  : "flex-col gap-0.5 px-3 py-2.5 text-slate-600"
              )}
              activeProps={{
                className: "!border-blue-200 !bg-blue-50/80 !text-blue-700 font-semibold shadow-xs",
              }}
            >
              {collapsed ? (
                <item.icon
                  className="size-5 shrink-0 text-slate-600 group-hover:text-slate-900 group-data-[status=active]:text-blue-700 transition-colors"
                  aria-hidden
                />
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      className="size-4 shrink-0 text-slate-500 group-hover:text-slate-900 group-data-[status=active]:text-blue-700 transition-colors"
                      aria-hidden
                    />
                    <span className="text-sm font-medium tracking-tight text-slate-900">
                      {item.label}
                    </span>
                  </div>
                  <span className="pl-6.5 text-[11px] text-slate-500 line-clamp-1">
                    {item.description}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Load initial collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("issue_pilot_sidebar_collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("issue_pilot_sidebar_collapsed", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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

  const renderUserProfile = (collapsed: boolean) => {
    const avatar = session.user.avatar_url ? (
      <img
        src={session.user.avatar_url}
        alt={session.user.login}
        className="size-8 rounded-full object-cover border border-slate-200 shrink-0"
      />
    ) : (
      <div className="size-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
        {session.user.login.slice(0, 2).toUpperCase()}
      </div>
    );

    if (collapsed) {
      return (
        <div className="border-t border-slate-200/80 p-2 bg-slate-50/70 flex flex-col items-center gap-2">
          <Link
            to="/app/profile"
            className="flex size-9 items-center justify-center rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all active:scale-[0.98]"
            title={`Tech Profile (@${session.user.login})`}
          >
            {avatar}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sign out"
            className="size-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-[0.98]"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      );
    }

    return (
      <div className="border-t border-slate-200/80 p-3 bg-slate-50/70">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/app/profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg p-1.5 hover:bg-white hover:border-slate-200 border border-transparent transition-all group active:scale-[0.98]"
            title="Open Tech Profile"
          >
            {avatar}
            <div className="min-w-0 flex-1 text-left">
              <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {session.user.name || session.user.login}
              </div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                @{session.user.login}
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sign out"
            className="size-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 active:scale-[0.98]"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    );
  };

  const desktopSidebar = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/90 shadow-xs">
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200/80",
          isCollapsed ? "justify-center px-2 flex-col py-2" : "justify-between px-4"
        )}
      >
        <Logo compact={isCollapsed} />
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            title="Collapse sidebar"
            className="size-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98]"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      {isCollapsed && (
        <div className="pt-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            title="Expand sidebar"
            className="size-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98]"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto py-4", isCollapsed ? "px-2" : "px-3")}>
        <Nav collapsed={isCollapsed} />
      </div>

      {renderUserProfile(isCollapsed)}
    </div>
  );

  const mobileSidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Nav onNavigate={() => setMobileOpen(false)} />
      </div>
      {renderUserProfile(false)}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden lg:block z-30 transition-all duration-200 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {desktopSidebar}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-white p-0 border-r border-slate-200">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {mobileSidebar}
        </SheetContent>
      </Sheet>

      {/* Main Surface */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div className="lg:hidden">
              <Logo />
            </div>

            {/* Sidebar Expand toggle button if collapsed */}
            {isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                title="Expand sidebar"
                className="hidden lg:flex size-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98]"
              >
                <PanelLeft className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
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

            <Link
              to="/app/profile"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors shadow-2xs active:scale-[0.98]"
              title="Open Tech Profile"
            >
              {session.user.avatar_url ? (
                <img
                  src={session.user.avatar_url}
                  alt={session.user.login}
                  className="size-5 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="size-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {session.user.login.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-mono font-medium">{session.user.login}</span>
            </Link>
          </div>
        </header>

        <main key={pathname} className="page-enter mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
