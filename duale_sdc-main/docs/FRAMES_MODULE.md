# Frames Module

This document is a deep-dive into the **frames calculator** — the `/frames` route and every utility it relies on.

For the underlying structural engineering theory, see [`ENGINEERING_CONCEPTS.md`](ENGINEERING_CONCEPTS.md).

---

## Overview

The frames module analyses a **portal frame** consisting of two vertical columns and one horizontal beam using the slope-deflection method. The analysis includes **sway** (horizontal displacement δ of the beam level).

The unknowns solved for are:
- **θB** — rotation at the top of Column 1 / left end of beam
- **θC** — rotation at the top of Column 2 / right end of beam
- **θD** (optional) — rotation at the bottom of Column 2 when it is hinged/rollered
- **δ** — horizontal sway displacement

Four equations are needed (or three if θD = 0):
1. Moment equilibrium at joint B: `M_C1e + M_BCs = 0`
2. Moment equilibrium at joint C: `M_BCe + M_C2s = 0`
3. (Optional) Bottom of Column 2 is pinned → `M_C2e = 0`
4. Horizontal equilibrium (shear equation): `H₁ + H₂ + P_horizontal = 0`

---

## File: `app/frames/page.tsx`

### State

| Variable | Type | Description |
|----------|------|-------------|
| `formData` | `{numberOfColumns, numberOfBeams, columns, beams}` | User inputs |
| `results` | `CalculationResults \| null` | Complete analysis output |
| `calculationError` | `string \| null` | Error message on failure |

### `handleSubmit` — Calculation Pipeline

```
1. calculateFrameFixedEndMoments(column/beam)   per member → FEM results
2. generateFrameSlopeDeflectionEquations(...)              → slope-deflection equations
3. generalFrameEquation(equations, hasHingeOrRoller)       → boundary equations (eq1, eq2, [eq3])
4. generateFrameShearEquation(columns, equations)          → shear equation string
5. simplifyFrameShearEquation(shearEq)                     → simplified form
6. solveFrameEquations(eq1, eq2, [eq3], simplifiedShearEq) → { θB, θC, θD, δ }
7. calculateFrameFinalMoments(equations, columns, θ..., δ, EI=1) → final moments
8. calculateFrameHorizontalReactions(columns, finalMoments)       → H1, H2
9. calculateFrameVerticalReactions(beams, finalMoments)           → RA, RD
10. calculateColumnBMSF(column, index, finalMoments, hReactions)  per column
11. calculateBeamBMSF(beam, startMoment, verticalReactions)       per beam
```

Note: `EI = 1` is passed to `calculateFrameFinalMoments` because frame slope-deflection equations are built with EI already factored into each coefficient (the solution values are `EI·θ` units, not plain θ).

---

## File: `app/frames/types/index.ts`

Defines all TypeScript types specific to the frame analysis:

### `Column`
```typescript
{
  length: number;               // Column height (m)
  momentOfInertia: number;      // Second moment of area
  supportType: ColumnSupportType; // "fixed" | "hinged" | "roller" | "none"
  loadType: "NONE" | "CENTER_POINT";
  loadMagnitude: number;        // Horizontal point load (kN)
}
```

### `Beam`
```typescript
{
  length: number;
  momentOfInertia: number;
  loadMagnitude: number;
  loadType: "NONE" | "UDL" | "CENTER_POINT" | "POINT_AT_DISTANCE";
  pointLoadDistances?: { a?: number; b?: number };
}
```

### `CalculationResults`
The full output object stored in page state and passed to all three result components. Contains:
- `columns` / `beams` — FEM arrays
- `slopeDeflectionEquations` — symbolic equation strings per member
- `boundaryEquations` — joint equilibrium equation strings
- `shearEquation` — raw + simplified shear equation strings + coefficient breakdown
- `solution` — solved θB, θC, θD, δ values
- `finalMoments` — dictionary of member-end moments (keys like `MC1s`, `MBCe`)
- `horizontalReactions` / `verticalReactions` — reaction dictionaries
- `columnBMSF` / `beamBMSF` — BMSF section arrays

---

## File: `app/utils/frameloadTypes.ts`

Defines two sets of load type constants and labels:

- `FRAME_FRAME_LOAD_TYPES` — for columns: `NONE`, `CENTER_POINT`
- `FRAME_BEAM_LOAD_TYPES` — for beams: `NONE`, `CENTER_POINT`, `POINT_AT_DISTANCE`, `UDL`

The labels are displayed in the column and beam form select dropdowns.

---

## File: `app/utils/femFrames.ts`

### `calculateFrameFixedEndMoments(member): { start, end }`

Applies fixed-end moment formulas to any frame member (column or beam). Returns `{ start: 0, end: 0 }` for hinged/roller members.

Supported load types:
- `NONE` → zero moments
- `UDL` → ±wL²/12
- `CENTER_POINT` → ±PL/8
- `POINT_AT_DISTANCE` → −Pb²a/L², +Pba²/L²

---

## File: `app/utils/frameSlopeDeflection.ts`

### `generateFrameSlopeDeflectionEquations(columns, beams, fixedEndMoments)`

Returns an array of `FrameSlopeDeflectionEquation`:
```typescript
{ memberLabel: "C1" | "C2" | "BC", startEquation: string, endEquation: string }
```

#### Columns (C1 and C2)

For each column the sway term is included:
```
M_col_start = FEM + (2I/L)·EI·2θ_top + (2I/L)·EI·θ_base − (2I/L)·(3/L)·I·EI·δ
M_col_end   = FEM + (2I/L)·EI·θ_top + (2I/L)·EI·2θ_base − same_δ_term
```

- For **Column 1** (C1): `θ_top = θB`, `θ_base = θA`
  - If the base is **fixed** (θA = 0): only the θB term appears
  - If the base is **hinged/roller**: both θA and θB terms appear (θA is an additional unknown handled differently — currently assumes θA = 0 implicitly for simplicity in the solver)
- For **Column 2** (C2): `θ_top = θC`, `θ_base = θD`
  - Fixed base → only θC term
  - Hinged/roller base → both θC and θD terms

The `baseCoefficient = 2/L` and `deltaCoeff = 3/L`, so:
- Sway term = `baseCoefficient × deltaCoeff × I · EIδ` = `6I/L² · EIδ`

#### Beams (labelled "BC")

Beams do not sway, so no δ term:
```
M_BCs = FEM + (2I/L)·2·EIθB + (2I/L)·1·EIθC
M_BCe = FEM + (2I/L)·1·EIθB + (2I/L)·2·EIθC
```

---

## File: `app/utils/frameBoundaryCondition.ts`

### `generalFrameEquation(equations, hasHingeOrRoller)`

Selects between two internal formatters:
- `getFrameBoundaryEquations` — standard case (all fixed bases), produces `eq1` and `eq2`
- `getFrameBoundaryEquationsExtended` — hinged/roller base case, produces `eq1`, `eq2`, and optionally `eq3`

### Internal formatters

Both formatters work by:
1. Concatenating the relevant equation strings (e.g. `C1.endEquation + " + " + BC.startEquation`)
2. Splitting the combined string into signed terms
3. Accumulating numeric coefficients for EIθB, EIθC, EIθD, EIδ, and a constant
4. Reconstructing a clean, simplified string

`formatEquationWithThetaD` additionally handles the θD variable for the extended case.

### When is eq3 needed?
When any column has `supportType === "hinged" | "roller"`, an extra equation is added:
```
M_C2e = 0
```
This is the compatibility condition for a pin-base column (moment at base = 0).

---

## File: `app/utils/frameShearEquation.ts`

### `generateFrameShearEquation(columns, equations): { shearEquation }`

Builds the horizontal equilibrium equation from column shear forces. For each column:
```
H_col = (M_start + M_end) / h          (no horizontal load)
H_col = (M_start + M_end − P·h/2) / h  (centre point horizontal load)
```

The full equation:
```
(C1_equations) / h1 + (C2_equations) / h2 + P_total = 0
```

For **fixed-base** columns both `startEquation + endEquation` are used (since both ends are moment-carrying). For **hinged-base** columns only the `endEquation` (top moment) is used.

### `simplifyFrameShearEquation(equation)`

Parses the raw fraction-based shear equation string, divides each bracketed sub-expression by its divisor, and accumulates the resulting coefficients for θB, θC, θD, δ, and the constant.

Returns:
```typescript
{
  simplifiedEquation: "1.20EIθB + 1.20EIθC + -0.60EIδ = 50.00",
  coefficients: { thetaB, thetaC, thetaD, delta, constant }
}
```

### `solveFrameEquations(eq1, eq2, eq3, shearEq)`

Dispatches to either:
- `solveFrameEquationsWithoutThetaD` → 3×3 Gaussian elimination (θB, θC, δ)
- `solveFrameEquationsWithThetaD` → 4×4 Gaussian elimination (θB, θC, θD, δ)

Both internal solvers use `solveMatrix` which performs **Gaussian elimination with partial pivoting** to return the solution values rounded to 4 decimal places.

---

## File: `app/utils/framesFinalMoments.ts`

### `calculateFrameFinalMoments(equations, columns, θB, θC, θD, δ, EI)`

Iterates over each frame slope-deflection equation and evaluates:
```
M_start = constant + thetaB·θB + thetaC·θC + thetaD·θD + delta·δ
M_end   = (same pattern)
```

Special case: for column end moments where `supportType !== "fixed"`, the far-end (base) moment is forced to 0 — this is consistent with the boundary condition M = 0 at a pin/roller.

Moment keys use the convention:
- `M{memberLabel}s` for start (e.g. `MC1s`, `MBCs`)
- `M{memberLabel}e` for end (e.g. `MC1e`, `MBCe`)

---

## File: `app/utils/frameReactions.ts`

### `calculateFrameHorizontalReactions(columns, finalMoments)`

For each column:
```
H = (M_start + M_end) / height               [no applied load]
H = (M_start + M_end − P·height/2) / height  [centre point load]
```

Results stored as `H1`, `H2`.

### `calculateFrameVerticalReactions(beams, finalMoments)`

Same moment equilibrium logic as the beam reaction calculator but reads moments from `MBCs` and `MBCe`:
```
ΣM_start = 0: R_end = (M_end + load_moment + M_start) / L
ΣV = 0:       R_start = total_load − R_end
```

Results stored as `RA`, `RD`.

---

## File: `app/utils/frameBMSF.ts`

### `calculateColumnBMSF(column, columnIndex, finalMoments, horizontalReactions)`

Computes BM and SF at key section points for a column (vertical member). The horizontal reaction at the base provides the "shear" force in the column.

```
V(x) = −H        (constant for no-load column)
M(x) = M_start − H·x
```

For a **centre point load**, the column is divided into two sections:
- Before load: uses `−H` as shear
- After load: uses `−H − P` as shear (P now active)

Returns a `ColumnBMSF` object with a `sections` array, where each section has `x`, `bendingMoment`, and `shearForce` arrays.

### `calculateBeamBMSF(beam, startMoment, verticalReactions)`

Computes BM/SF along the beam using the start vertical reaction RA:

```
V(x) = RA − w·x           (UDL)
M(x) = RA·x + M_start − w·x·(x/2)
```

For **UDL**: 21 evenly-spaced points are generated for a smooth parabolic curve.
For **POINT_AT_DISTANCE**: only `[0, a, L]` points are used (piecewise linear).
For **CENTER_POINT**: two sections before and after `L/2`.

---

## Frame Component Files

### `app/components/fr-results.tsx`
Renders every section of the frame calculation results in a vertically stacked layout. Uses `ResultCard` and `SectionTitle` inline helper components for consistent styling. Notable: the Beam BMSF section uses `bmsf.x.length === 21` as a heuristic to detect UDL (21 points) vs point loads (3–4 points) and adjusts the display accordingly.

### `app/components/frame-sf-diagram.tsx`
Draws the Shear Force Diagram as an SVG using two column paths and one beam path. Scale factors are computed from the data extremes:
- `heightScale = frameHeight / maxColumnHeight`
- `columnShearScale = columnWidth / (2 × maxColumnShear)`
- `beamLengthScale = (rightColumnX − leftColumnX) / maxBeamLength`
- `beamShearScale = beamHeight / (2 × maxBeamShear)`

Column shear paths are drawn left of C1 and right of C2 (outward). Beam shear paths are drawn above/below the beam centreline.

### `app/components/frame-bm-diagram.tsx`
Same layout as the SFD component but uses `bendingMoment` values. Moment paths are drawn inward (toward the interior of the frame) following the BMD convention: columns draw rightward for C1 and leftward for C2. The beam BMD is drawn below/above the centreline.

### `app/components/frame-forms/column-form.tsx`
Renders one card per column with length, moment of inertia, support type, load type, and (conditionally) load magnitude fields. Uses `FRAME_FRAME_LOAD_TYPES` and `FRAME_FRAME_LOAD_TYPE_LABELS` for the load type select options.

### `app/components/frame-forms/beam-form.tsx`
Renders one card per beam. Conditionally shows point load distance fields (a and b) when load type is `POINT_AT_DISTANCE`.
