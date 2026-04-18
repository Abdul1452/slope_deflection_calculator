# Project Structure

This document provides an annotated directory layout for the **Slope Deflection Calculator** application.

All source code lives inside `duale_sdc-main/` (the Next.js project root).

---

## Top-level files

| File | Purpose |
|------|---------|
| `package.json` | Project name (`version_14`), scripts, dependency list |
| `tsconfig.json` | TypeScript configuration — `strict`, path alias `@/*` → `./` |
| `next.config.mjs` | Minimal Next.js config (no customisations) |
| `tailwind.config.ts` | Tailwind theme extensions — CSS variable-based colours, border-radius tokens, `darkMode: ["class"]` |
| `postcss.config.js / .mjs` | PostCSS pipeline (Tailwind + Autoprefixer) |
| `components.json` | shadcn/ui CLI configuration — style `new-york`, base colour `zinc`, icon library `lucide` |
| `typings.d.ts` | Shared TypeScript types used across the **beams** module |
| `README.md` | Project overview, setup instructions, workflow diagrams |

---

## `app/` — Next.js App Router root

### `app/layout.tsx`
Root layout rendered around every page. Mounts:
- `<ThemeProvider>` — enables system/light/dark theme switching
- `<Navbar>` — persistent top navigation bar
- `<main>` — content area with `pt-16` to clear the fixed navbar

### `app/page.tsx`
Landing page. Uses Framer Motion scroll parallax for the background blobs. Renders a hero section with links to `/beams` and `/frames`, followed by three feature-highlight cards.

### `app/globals.css`
Defines the full set of CSS custom properties (HSL colour tokens) for both light and dark themes. Also applies `@tailwind` directives and sets `box-sizing: border-box`.

### `app/fonts/`
Self-hosted `GeistVF.woff` and `GeistMonoVF.woff` variable font files (loaded by `next/font/google` in layout).

### `app/settings.json`
VS Code workspace setting: `"css.lint.unknownAtRules": "ignore"` — suppresses Tailwind `@layer` lint warnings.

---

## `app/beams/`

### `app/beams/page.tsx`
The beams calculator page. This is the main orchestration component for the beam analysis workflow. It:
1. Manages all React state: form data, results, equations, boundary conditions, final moments, reactions, critical points, and error messages.
2. Renders a form with `<SpanInput>` sub-components and sinking support inputs.
3. On submit, calls the utility functions in sequence (FEM → SDE → solve → finalise → BMSF).
4. Renders the `<Results>` component once calculations succeed.

---

## `app/frames/`

### `app/frames/page.tsx`
The frames calculator page. Orchestrates the full portal frame analysis workflow:
1. Manages state for columns, beams, and all intermediate/final calculation results.
2. Renders `<ColumnForm>` and `<BeamForm>` sub-forms.
3. On submit, calls frame utility functions in sequence.
4. Renders `<FramesResults>`, `<FrameShearForceDiagram>`, and `<FrameBendingMomentDiagram>`.

### `app/frames/types/index.ts`
TypeScript type definitions specific to the frame module:
- `ColumnSupportType` — union of `"hinged" | "roller" | "fixed" | "none"`
- `Column` — length, moment of inertia, support type, load type, load magnitude
- `Beam` — length, moment of inertia, load type, load magnitude, optional point load distances
- `FEMWithLabel` — fixed-end moment result with a display label
- `CalculationResults` — the complete results object returned after a successful frame analysis (includes FEMs, equations, boundary equations, shear equation, solution, final moments, reactions, and BMSF arrays for columns and beam)

---

## `app/components/`

### `navbar.tsx`
Fixed top navigation bar. Uses `usePathname()` to highlight the active route. Includes a theme toggle button (Sun/Moon icon) that calls `setTheme()` from `next-themes`.

### `theme-provider.tsx`
Thin wrapper around `NextThemesProvider` from `next-themes`. Passes all props through so the root layout can configure theme attributes declaratively.

### `span-inputs.tsx`
A single span's input card for the beams calculator. Renders fields for length, moment of inertia, start/end support type, load type, load magnitude, and (conditionally) point load distances. Calls `onChange` with the updated `Span` object.

### `results.tsx`
Displays the full beam analysis results after calculation:
1. Fixed-end moments per span
2. Slope-deflection equations per span
3. Solved θ values (boundary conditions)
4. Final moments at each support
5. Support reactions
6. Critical BMSF point table per span
7. `<BMSFCharts>` (charts area)

### `fr-results.tsx`
Displays the full frame analysis results:
- FEM tables for columns and beams
- Slope-deflection equations per member
- Boundary equations
- Shear equation and simplified form
- Solved unknowns (EIθB, EIθC, EIθD, EIδ)
- Final moments
- Horizontal and vertical reactions
- Column and beam BMSF values per section

### `bmsf-charts.tsx`
Renders two `<AreaChart>` (Recharts) components for the beam analysis:
- **Shear Force Diagram**: data key `shearForce`, blue fill
- **Bending Moment Diagram**: data key `bendingMoment`, red fill
Both use a continuous X-axis representing cumulative position along all spans.

### `frame-bm-diagram.tsx`
Renders a bending moment diagram for the frame as an inline `<svg>`. Draws dashed centreline paths for both columns and the beam, then fills closed polygonal paths representing moment areas. Moment values are labelled at key points.

### `frame-sf-diagram.tsx`
Renders a shear force diagram for the frame as an inline `<svg>`. Same layout approach as the BMD component but with shear force data and a different colour scheme (blue/sky).

### `frame-forms/column-form.tsx`
Input sub-form rendered once for each column. Fields: length, moment of inertia, support type (select), load type (select), load magnitude (shown only if load type ≠ NONE).

### `frame-forms/beam-form.tsx`
Input sub-form rendered once for each beam. Fields: length, moment of inertia, load type (select), load magnitude, and (conditionally) point load distances a and b.

---

## `app/utils/` — Engineering calculation utilities

All utility functions are pure TypeScript functions with no React dependency. They form the mathematical core of the application.

### `loadTypes.ts`
Defines `LOAD_TYPES` constant object (beam load identifiers) and `LOAD_TYPE_LABELS` map (human-readable descriptions used in the select dropdown).

### `frameloadTypes.ts`
Defines separate load type constants and labels for frame columns (`FRAME_FRAME_LOAD_TYPES`) and frame beams (`FRAME_BEAM_LOAD_TYPES`).

### `calculations.ts`
`calculateFixedEndMoments(span)` — applies the standard fixed-end moment formula for each supported load type and returns `{ start, end }` FEM values.

### `femFrames.ts`
`calculateFrameFixedEndMoments(member)` — same FEM logic applied to frame members (columns and beam). Returns zero moments for hinged/roller supports.

### `slopeDeflection.ts`
`generateSlopeDeflectionEquations(spans, fixedEndMoments, sinkingSupports)` — builds a symbolic string equation for each span-end moment (e.g. `"10.00 + 1.33EIθB + 0.67EIθC - 0.0050EI"`). Accounts for fixed ends (θ = 0 → term omitted), sinking supports (δ term), and spans with missing supports.

### `frameSlopeDeflection.ts`
`generateFrameSlopeDeflectionEquations(columns, beams, fixedEndMoments)` — same concept but for frame members. Columns include a sway (EIδ) term; beams do not. Handles fixed vs hinged column bases by including or excluding the far-end θ term.

### `boundaryCondition.ts`
`solveSimultaneousEquations(eq1, eq2, eq3, E, I)` — parses symbolic equations, extracts coefficients for θB, θC, θD, and a constant term, then solves using **Cramer's Rule** on a 2×2 or 3×3 matrix. Returns the θ values or `null` if the determinant is zero.

### `frameBoundaryCondition.ts`
`generalFrameEquation(equations, hasHingeOrRoller)` — builds the joint-equilibrium boundary equations by adding the moments meeting at joint B (end of C1 + start of BC) and joint C (end of BC + start of C2). Optionally adds a third equation for a hinged/roller column base (M = 0 condition). Returns simplified string equations.

### `frameShearEquation.ts`
`generateFrameShearEquation(columns, equations)` — constructs the horizontal equilibrium equation `(M_C1s + M_C1e) / h1 + (M_C2s + M_C2e) / h2 + P_total = 0`.

`simplifyFrameShearEquation(equation)` — collects EIθ and EIδ coefficients from the raw equation string.

`solveFrameEquations(eq1, eq2, eq3, shearEq)` — uses **Gaussian elimination** on a 3×3 or 4×4 augmented matrix to solve for θB, θC, optional θD, and δ.

### `calculateFinalMoments.ts`
`calculateFinalMoments(equations, θB, θC, θD, EI)` — re-evaluates each slope-deflection equation with the solved θ values to produce the actual numerical member-end moments (kN·m).

### `framesFinalMoments.ts`
`calculateFrameFinalMoments(equations, columns, θB, θC, θD, δ, EI)` — same process for frames, additionally substituting δ.

### `calculateReactions.ts`
`calculateSpanReactions(span, startMoment, endMoment)` — takes moment equilibrium about the start support to find end reaction, then uses vertical equilibrium for start reaction.

`calculateReactions(spans, finalMoments)` — iterates spans and accumulates reactions at shared support nodes.

### `frameReactions.ts`
`calculateFrameHorizontalReactions(columns, finalMoments)` — H = (M_start + M_end) / h (adjusted for point loads).

`calculateFrameVerticalReactions(beams, finalMoments)` — computes RA and RD using moment equilibrium.

### `calculateBMSF.ts`
`calculateBMSF(spans, moments)` — generates 100-point BM/SF arrays per span by integrating from the start reaction. Also computes start reactions and start moments.

### `frameBMSF.ts`
`calculateColumnBMSF` / `calculateBeamBMSF` — BM/SF at key section points for frame members.

### `criticalBMSF.ts`
`extractCriticalBMSF` — picks notable points (supports, load positions, zero-shear location) from the continuous BMSF arrays for the results table.

---

## `components/ui/`

shadcn/ui primitives styled with Tailwind CVA variants:

| Component | Radix primitive |
|-----------|----------------|
| `button.tsx` | `@radix-ui/react-slot` |
| `card.tsx` | Native `div` |
| `input.tsx` | Native `input` |
| `label.tsx` | `@radix-ui/react-label` |
| `select.tsx` | `@radix-ui/react-select` |

---

## `lib/`

### `lib/utils.ts`
Exports `cn(...inputs)` — merges Tailwind class strings using `clsx` + `tailwind-merge`.
