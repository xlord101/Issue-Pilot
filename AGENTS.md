# Issue Pilot — AI Agent Directives & Operational Rules

This file defines the mandatory engineering standards, architectural invariants, and design guidelines for Issue Pilot. Any agent operating in this repository MUST automatically follow these rules without requiring explicit user prompts.

---

## 1. Mandatory Frontend Design & Taste Guidelines (Non-AI Standard)

For any frontend work (UI development, components, styling, animations, reviews, or refactors), you MUST automatically enforce the principles from **`design-taste-frontend`**, **`emil-design-eng`**, **`impeccable`**, **`better-interface`**, and **`shadcn`**:

### A. Anti-AI Slop Rules (Strictly Enforced)
- **NO Generic "Purple/Cyan Soup" Blob Gradients**: Do NOT throw arbitrary multi-colored blurred orbs or rainbow radial gradients across the screen. Every background must be an engineered dark slate/obsidian (`#080C14` to `#0F172A`) with intentional, subtle light sources.
- **Physical Elevation & Specular Highlights**: Cards must feel like physical glass layers. Use `bg-slate-900/40 backdrop-blur-xl border border-white/10`, complemented by a subtle 1px specular top highlight line (`before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`).
- **High-Contrast Typographic Hierarchy**: Headings must be crisp off-white (`#F8FAFC`), body text legible slate (`#94A3B8`), and metrics/scores strictly monospaced (`JetBrains Mono`). All text must pass WCAG AA contrast standards.
- **Authentic Affordances**: Do not display meaningless decorative mockups. Every data card, progress bar, or badge must represent real underlying metrics (e.g. repo health, maintainer response time in hours, commit freshness, skill match %).

### B. Emil Kowalski Motion & Interaction Physics
- **Button Affordance**: Every interactive button and pressable card MUST have an `:active` state with `transform: scale(0.98)` and `transition: transform 140ms ease-out`. Buttons must feel tactile and responsive.
- **Never Animate from `scale(0)`**: Nothing in the physical world emerges from zero size. Entrance animations must start from `scale(0.96)` combined with opacity.
- **No Sluggish Animations**: Never animate keyboard shortcuts or frequent actions (e.g. palette toggles). Standard modal/dialog entrances must use `ease-out` with durations between 150ms–250ms.
- **Origin-Aware Popovers**: Popovers and dropdowns must scale from their trigger point (`transform-origin: var(--transform-origin)`), while modals remain centered.
- **Spring Curves**: When using Framer Motion, use realistic physical springs: `{ type: "spring", duration: 0.45, bounce: 0.15 }`. Avoid unnatural rubber-band bounce.

### C. UX Completeness (`better-interface` & `impeccable`)
- Every page and view must support:
  1. **Loading state**: Polished skeleton loaders matching the exact card geometry.
  2. **Empty state**: Clean illustrations and actionable next steps.
  3. **Error state**: Clear, human explanation with retry capability.
  4. **Responsive viewports**: Fully usable from mobile (320px) up to ultra-wide desktop (1440px+).

---

## 2. Core Product Surfaces (No Bloat)

Do NOT generate or maintain generic placeholder pages (e.g. fake pricing tiers, filler marketing pages). Focus strictly on the 4 core product surfaces:
1. **Smart Onboarding & Behavioral Calibration Flow**:
   - 3-question card-deck calibration (Experience, Navigation Comfort, Challenge Goal).
   - Tech stack & proficiency selection.
   - Calibrated capability dial ($0–100$) and confidence metric.
2. **Personalized Recommendations Feed (Home Dashboard)**:
   - Contributor badge & level.
   - Hero issue cards with 6-component score breakdowns ($S, D, R, H, F, N$).
   - Grounded plain-English fit explanations.
   - 1-click Like (👍) and Dislike (👎) preference learning.
3. **What-If Algorithm Simulator**:
   - Hardware-fader style sliders for adjusting factor weights.
   - Real-time C++ re-ranking with smooth layout-swap animations.
4. **Multi-Platform Issue Explorer**:
   - Search and filter across GitHub, GitLab, Codeberg, and Bugzilla.

---

## 3. Backend & Architectural Invariants

- **Spring Boot Backend**: Runs on Java 21, Spring Boot 3.4.3 (`http://localhost:8000/api`).
- **C++ Ranking Core**: Deterministic 6-factor model located in `ranking_engine/`. Binary path: `ranking_engine/build/issue_pilot_ranking_engine.exe`.
- **Fault-Tolerant Resilience**: All repositories have in-memory fallbacks when MongoDB Atlas is offline.
- **Zero Test Regressions**: All 204 backend tests in `mvn test` must continue to pass 100% on any changes.

