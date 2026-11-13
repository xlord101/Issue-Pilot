import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    const updateDom = () => {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("issue_pilot_theme", nextTheme);
      } catch {
        /* ignore localStorage quota/disabled errors */
      }
      setTheme(nextTheme);
    };

    // Add smooth transition helper class
    document.documentElement.classList.add("theme-transition");

    // Support browser View Transitions API if available
    if ("startViewTransition" in document && typeof document.startViewTransition === "function") {
      document.startViewTransition(() => {
        updateDom();
      });
    } else {
      updateDom();
    }

    // Clean up temporary transition class after animation completes
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 350);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "relative size-9 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs active:scale-[0.98] transition-all overflow-hidden",
        className,
      )}
    >
      {/* Sun icon for light mode */}
      <Sun
        className={cn(
          "size-4 text-amber-500 transition-all duration-300 ease-out",
          mounted && theme === "dark"
            ? "-rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
      />
      {/* Moon icon for dark mode */}
      <Moon
        className={cn(
          "absolute size-4 text-blue-400 transition-all duration-300 ease-out",
          mounted && theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0",
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
