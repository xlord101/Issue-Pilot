import React from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "vibrant";
}

/**
 * Animated 3-color aura mesh background.
 * Replaces harsh static gradients with organic, fluid 3-color motion:
 * - Signal Cobalt Blue (#2563EB / #1D4ED8)
 * - Sky / Cyan Glow (#0284C7 / #38BDF8)
 * - Violet / Indigo Aura (#6366F1 / #818CF8)
 */
export function AuroraBackground({
  children,
  className,
  intensity = "subtle",
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#fafcff] text-slate-900 transition-colors",
        className
      )}
      {...props}
    >
      {/* Animated 3-Color Glow Canvas */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Color 1: Cobalt Blue (#2563EB) — Left/Center Drift */}
        <div
          className={cn(
            "animate-aura-1 absolute -top-[10%] -left-[10%] h-[580px] w-[580px] rounded-full blur-[110px] transform-gpu",
            intensity === "vibrant"
              ? "bg-blue-600/35"
              : "bg-blue-500/22"
          )}
        />

        {/* Color 2: Cyan / Sky (#0284C7) — Bottom/Right Drift */}
        <div
          className={cn(
            "animate-aura-2 absolute -bottom-[15%] -right-[5%] h-[620px] w-[620px] rounded-full blur-[120px] transform-gpu",
            intensity === "vibrant"
              ? "bg-cyan-400/30"
              : "bg-sky-400/20"
          )}
        />

        {/* Color 3: Soft Violet / Indigo (#6366F1) — Bottom-Left / Center Ambient Glow */}
        <div
          className={cn(
            "animate-aura-3 absolute top-[30%] left-[25%] h-[520px] w-[520px] rounded-full blur-[125px] transform-gpu",
            intensity === "vibrant"
              ? "bg-indigo-500/25"
              : "bg-violet-400/18"
          )}
        />

        {/* Subtle physical specular top illumination line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
