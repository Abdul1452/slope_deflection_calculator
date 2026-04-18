# Slope Deflection Calculator (SDC)

A web-based structural engineering tool for analysing **continuous beams** and **portal frames** using the classic **slope-deflection method**. Built with Next.js 14 and TypeScript.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Engineering Background](#engineering-background)
- [Documentation](#documentation)

---

## Features

### Beams Calculator (`/beams`)
- Analyses 3-span continuous beams
- **Support types** per node: Fixed, Hinged, Roller, Free (none)
- **Load types** per span:
  - No load
  - UDL (uniformly distributed load) over whole span
  - Point load at centre
  - Point load at distance *a* from left / *b* from right
  - Two equal point loads at L/3 spacing
  - Three equal point loads at L/4 spacing
  - Triangular load (VDL) increasing to the right
  - Triangular load (VDL) increasing to the left
- Sinking/settling support input per node (δ)
- Step-by-step result output:
  1. Fixed-end moments
  2. Slope-deflection equations (in terms of EI·θ)
  3. Solved boundary conditions (θ values)
  4. Final member-end moments
  5. Support reactions
  6. Critical BMSF points table
- Interactive Bending Moment Diagram and Shear Force Diagram (Recharts area charts)

### Frames Calculator (`/frames`)
- Portal frame analysis (2 columns + 1 connecting beam)
- **Column** support types: Fixed, Hinged, Roller, None; load: None or centre point load
- **Beam** load types: None, UDL, centre point load, point load at distance
- Full sway analysis — unknowns: θB, θC, optional θD, and horizontal sway δ
- SVG-rendered BMD and SFD overlaid on the frame shape

### General
- Light / Dark mode toggle (next-themes, system default)
- Animated transitions (Framer Motion)
- Responsive layout (Tailwind CSS, shadcn/ui)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + shadcn/ui (New York style) |
| UI primitives | Radix UI |
| Animations | Framer Motion |
| Charts – beams | Recharts (AreaChart) |
| Charts – frames | Raw SVG |
| Icons | Lucide React |
| Theme | next-themes |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm, yarn, pnpm, or bun

### Install & Run

```bash
cd duale_sdc-main
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
duale_sdc-main/
├── app/                            # Next.js App Router root
│   ├── layout.tsx                  # Root layout — Navbar + ThemeProvider wrapper
│   ├── page.tsx                    # Landing page with feature cards
│   ├── globals.css                 # Global CSS variables (light/dark tokens)
│   ├── fonts/                      # Self-hosted Geist font files
│   ├── settings.json               # VS Code workspace setting (CSS lint)
│   │
│   ├── beams/
│   │   └── page.tsx                # Beam calculator — form state + calculation orchestration
│   │
│   ├── frames/
│   │   ├── page.tsx                # Frame calculator — form state + calculation orchestration
│   │   └── types/
│   │       └── index.ts            # Frame-specific TypeScript interfaces/types
│   │
│   ├── components/                 # Domain UI components
│   │   ├── navbar.tsx              # Top navigation bar with theme toggle
│   │   ├── theme-provider.tsx      # Thin wrapper around next-themes ThemeProvider
│   │   ├── span-inputs.tsx         # Per-span input card used by beams page
│   │   ├── results.tsx             # Beam analysis results (FEM → equations → moments → charts)
│   │   ├── fr-results.tsx          # Frame analysis results (all sections)
│   │   ├── bmsf-charts.tsx         # Beam BMD/SFD using Recharts AreaChart
│   │   ├── frame-bm-diagram.tsx    # Frame BMD rendered as inline SVG
│   │   ├── frame-sf-diagram.tsx    # Frame SFD rendered as inline SVG
│   │   └── frame-forms/
│   │       ├── column-form.tsx     # Column input fields sub-form
│   │       └── beam-form.tsx       # Beam input fields sub-form
│   │
│   └── utils/                      # Engineering calculation utilities (pure functions)
│       ├── loadTypes.ts            # Beam load type constants + display labels
│       ├── frameloadTypes.ts       # Frame load type constants + display labels
│       ├── calculations.ts         # Beam fixed-end moment (FEM) formulas
│       ├── femFrames.ts            # Frame fixed-end moment formulas
│       ├── slopeDeflection.ts      # Beam slope-deflection equation builder (symbolic strings)
│       ├── frameSlopeDeflection.ts # Frame slope-deflection equation builder (with sway δ)
│       ├── boundaryCondition.ts    # Solve 2×2 / 3×3 simultaneous equations (Cramer's rule)
│       ├── frameBoundaryCondition.ts # Build frame joint-equilibrium boundary equations
│       ├── frameShearEquation.ts   # Build + simplify shear/sway equation; solve 3×3/4×4 matrix
│       ├── calculateFinalMoments.ts  # Substitute θ back into beam SDE to get final moments
│       ├── framesFinalMoments.ts   # Substitute θ, δ back into frame SDE to get final moments
│       ├── calculateReactions.ts   # Beam support reactions from moment equilibrium
│       ├── frameReactions.ts       # Frame horizontal + vertical reactions
│       ├── calculateBMSF.ts        # Beam BM/SF at 100 evenly-spaced points per span
│       ├── frameBMSF.ts            # Frame BM/SF for columns (sections) and beam
│       └── criticalBMSF.ts         # Pick notable BMSF points (supports, loads, zero-shear)
│
├── components/
│   └── ui/                         # shadcn/ui primitives (Button, Card, Input, Label, Select)
│
├── lib/
│   └── utils.ts                    # cn() — merges Tailwind class names safely
│
├── typings.d.ts                    # Shared TypeScript types for the beam module
├── docs/                           # Project documentation
│   ├── PROJECT_STRUCTURE.md        # Detailed directory + file descriptions
│   ├── ENGINEERING_CONCEPTS.md     # Slope-deflection theory background
│   ├── BEAMS_MODULE.md             # Beam calculator deep-dive
│   ├── FRAMES_MODULE.md            # Frame calculator deep-dive
│   └── COMPONENTS.md               # UI component reference
│
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
├── components.json                 # shadcn/ui configuration
└── package.json
```

---

## How It Works

### Beams workflow

```
User fills form (spans, supports, loads)
        │
        ▼
calculateFixedEndMoments()          ← Standard FEM formulas per load type
        │
        ▼
generateSlopeDeflectionEquations()  ← Builds symbolic string equations in EIθ terms
        │
        ▼
solveSimultaneousEquations()        ← Cramer's Rule on 2×2 or 3×3 coefficient matrix
        │
        ▼
calculateFinalMoments()             ← Substitute solved θ values back into each equation
        │
        ▼
calculateReactions()                ← Moment equilibrium gives RA, RB, RC … per span
        │
        ▼
calculateBMSF() + extractCriticalBMSF()  ← 100-point BM/SF data + notable points
        │
        ▼
Render Results component + BMSFCharts
```

### Frames workflow

```
User fills form (columns, beams)
        │
        ▼
calculateFrameFixedEndMoments()     ← Same FEM formulas applied to columns and beam
        │
        ▼
generateFrameSlopeDeflectionEquations()  ← Includes sway (δ) term for columns
        │
        ▼
generalFrameEquation()              ← Joint equilibrium: ΣM = 0 at B and C (+ D if hinge)
        │
        ▼
generateFrameShearEquation()        ← Horizontal equilibrium: ΣH = 0
simplifyFrameShearEquation()        ← Collect like terms (EIθB, EIθC, EIδ, constant)
        │
        ▼
solveFrameEquations()               ← Gaussian elimination on 3×3 or 4×4 augmented matrix
        │
        ▼
calculateFrameFinalMoments()        ← Substitute θ and δ values back
        │
        ▼
calculateFrameHorizontalReactions() + calculateFrameVerticalReactions()
        │
        ▼
calculateColumnBMSF() + calculateBeamBMSF()
        │
        ▼
Render FramesResults + FrameShearForceDiagram + FrameBendingMomentDiagram
```

---

## Engineering Background

The **Slope-Deflection Method** is a classical displacement-based technique for analysing statically indeterminate structures. It expresses member-end moments as functions of:

| Symbol | Meaning |
|--------|---------|
| FEM | Fixed-end moment (moment when both ends are fully fixed) |
| θ | Joint rotation (unknown — solved via equilibrium) |
| δ | Relative lateral displacement (sway) between member ends |
| EI | Flexural rigidity (modulus of elasticity × second moment of area) |

**General slope-deflection equation:**

```
M_near = FEM_near + (2EI/L)(2·θ_near + θ_far − 3·ψ)
```

where `ψ = δ/L` is the chord rotation.

**Boundary conditions** (equilibrium at each interior joint):

```
ΣM = 0   at joints B, C (and D if applicable)
```

For frames, the **shear equation** (horizontal equilibrium of the entire frame) provides the additional equation needed to solve for sway `δ`.

See [`docs/ENGINEERING_CONCEPTS.md`](docs/ENGINEERING_CONCEPTS.md) for the full mathematical derivations and fixed-end moment tables.

---

## Documentation

Detailed documentation lives in the `docs/` directory:

| File | Contents |
|------|----------|
| [`docs/ENGINEERING_CONCEPTS.md`](docs/ENGINEERING_CONCEPTS.md) | Slope-deflection theory, FEM tables, Cramer's rule |
| [`docs/BEAMS_MODULE.md`](docs/BEAMS_MODULE.md) | Beam calculator internals — each utility explained |
| [`docs/FRAMES_MODULE.md`](docs/FRAMES_MODULE.md) | Frame calculator internals — each utility explained |
| [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | UI component props and behaviour reference |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | Annotated directory layout |
