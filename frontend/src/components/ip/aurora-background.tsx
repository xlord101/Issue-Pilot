import React from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "vibrant";
}

/**
 * Animated 3-color pastel aura mesh background.
 * Exact color palette matched from reference recording:
 * - Color 1 (Lilac / Lavender): #cfbee5 / #cbb3e8
 * - Color 2 (Periwinkle / Soft Indigo-Blue): #abc0ef / #9ec0f5
 * - Color 3 (Powder Sky Blue / Cerulean): #a2d3f4 / #93d0f5
 * - Base surface: Soft pearl gradient from #f0f2f8 to #ffffff
 */
export function AuroraBackground({
  children,
  className,
  intensity = "vibrant",
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-[#f0f2f8] via-[#eef2f9] to-white dark:from-[#080c14] dark:via-[#0c1220] dark:to-[#080c14] text-slate-900 dark:text-slate-100 transition-colors",
        className,
      )}
      {...props}
    >
      {/* Animated 3-Color Glow Canvas */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Color 1: Soft Lilac / Lavender in light, deep glowing indigo in dark */}
        <div
          className={cn(
            "animate-aura-1 absolute -bottom-[10%] -left-[8%] h-[640px] w-[640px] rounded-full blur-[110px] transform-gpu transition-opacity duration-700",
            intensity === "vibrant"
              ? "bg-[#cbb3e8] dark:bg-indigo-600/30 opacity-90 dark:opacity-70"
              : "bg-[#cfbee5] dark:bg-indigo-700/20 opacity-75 dark:opacity-60",
          )}
        />

        {/* Color 2: Soft Periwinkle Blue in light, sapphire blue in dark */}
        <div
          className={cn(
            "animate-aura-2 absolute -bottom-[12%] left-[26%] h-[700px] w-[700px] rounded-full blur-[120px] transform-gpu transition-opacity duration-700",
            intensity === "vibrant"
              ? "bg-[#9ec0f5] dark:bg-blue-600/35 opacity-90 dark:opacity-75"
              : "bg-[#abc0ef] dark:bg-blue-700/25 opacity-80 dark:opacity-65",
          )}
        />

        {/* Color 3: Powder Sky Blue in light, electric cyan in dark */}
        <div
          className={cn(
            "animate-aura-3 absolute -bottom-[10%] -right-[8%] h-[640px] w-[640px] rounded-full blur-[110px] transform-gpu transition-opacity duration-700",
            intensity === "vibrant"
              ? "bg-[#93d0f5] dark:bg-cyan-500/25 opacity-90 dark:opacity-70"
              : "bg-[#a2d3f4] dark:bg-cyan-600/20 opacity-80 dark:opacity-60",
          )}
        />

        {/* Ambient Upper Illumination */}
        <div className="absolute -top-[15%] left-[20%] h-[400px] w-[600px] rounded-full bg-[#e8edfa]/60 dark:bg-blue-950/40 blur-[130px] transform-gpu" />

        {/* Seamless bottom fade into page flow */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-[#080c14]/60 dark:to-[#080c14]" />

        {/* Subtle physical specular top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 dark:via-white/15 to-transparent" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
