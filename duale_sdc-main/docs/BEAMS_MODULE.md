# Beams Module

This document is a deep-dive into the **beams calculator** — the `/beams` route and every utility it relies on.

For the underlying structural engineering theory, see [`ENGINEERING_CONCEPTS.md`](ENGINEERING_CONCEPTS.md).

---

## Overview

The beams module analyses a **3-span continuous beam** using the slope-deflection method. The user specifies:
- Global elastic properties (E, I)
- Per-span: length, local I factor, load type, load magnitude, start/end support type, optional point load distances
- Per-node: sinking/settlement value (δ) at each support

The calculation pipeline runs entirely on form submission (no server interaction) and is orchestrated by `app/beams/page.tsx`.

---

## File: `app/beams/page.tsx`

### State

| State variable | Type | Description |
|----------------|------|-------------|
| `formData` | `CalculatorFormData` | All user inputs (E, I, spans array, sinkingSupports array) |
| `results` | `FixedEndMomentResults[]` | Fixed-end moments per span (shown first in results) |
| `slopeDeflectionEquations` | `SlopeDeflectionEquation[]` | Symbolic SDE strings per span |
| `boundaryCondition` | `Solution` | Solved θB, θC, optional θD |
| `finalMoments` | `{ [key: string]: number }` | E.g. `{ MAB: -10.5, MBA: 8.2, ... }` |
| `reactions` | `{ [key: string]: number }` | E.g. `{ RA: 12, RB: 28, RC: 20, RD: 15 }` |
| `criticalPoints` | `SpanCriticalPoints[]` | Notable BM/SF values per span |
| `calculationError` | `string \| null` | Error message if calculation fails |
| `isFormValid` | `boolean` | Drives the disabled state of the Submit button |

### Validation
`validateForm()` returns `false` if:
- `modulusOfElasticity ≤ 0` or `momentOfInertia ≤ 0`
- `numberOfSpans < 3`
- Any span has `length ≤ 0`, `momentOfInertia ≤ 0`, or `loadMagnitude < 0`

### `handleSubmit` — Calculation Pipeline

```
1. calculateFixedEndMoments(span)          per span  → fixedEndMoments[]
2. generateSlopeDeflectionEquations(...)               → equations[]
3. Assemble boundary equations:
     eq1 = equations[0].endEquation + equations[1].startEquation
     eq2 = equations[1].endEquation + equations[2].startEquation
     eq3 = equations[2].endEquation (only if last support is hinged/roller)
4. solveSimultaneousEquations(eq1, eq2, eq3, E, I)     → solutions { θB, θC, θD? }
5. calculateFinalMoments(equations, θB, θC, θD, EI)   → moments
6. calculateReactions(spans, moments)                  → reactions
7. calculateBMSF(spans, moments)                       → { results, startReactions, startMoments }
8. extractCriticalBMSF(spans, results, ...)            → criticalPoints
```

---

## File: `app/utils/loadTypes.ts`

Exports two constant objects used throughout the beams module:

```typescript
LOAD_TYPES   // Keys: NONE, UDL, CENTER_POINT, POINT_AT_DISTANCE, 
             //       TWO_POINT_LOADS, THREE_POINT_LOADS, VDL_RIGHT, VDL_LEFT

LOAD_TYPE_LABELS  // Maps each key to a human-readable description for the UI select
```

---

## File: `app/utils/calculations.ts`

### `calculateFixedEndMoments(span: Span): { start: number; end: number }`

Applies the standard closed-form FEM formula for the given load type. Returns `{ start: 0, end: 0 }` for spans with no support at either end.

| Load type | FEM_start | FEM_end |
|-----------|-----------|---------|
| NONE | 0 | 0 |
| UDL (w) | −wL²/12 | +wL²/12 |
| CENTER_POINT (P) | −PL/8 | +PL/8 |
| POINT_AT_DISTANCE (P, a, b) | −Pb²a/L² | +Pba²/L² |
| TWO_POINT_LOADS (P) | −2PL/9 | +2PL/9 |
| THREE_POINT_LOADS (P) | −15PL/48 | +15PL/48 |
| VDL_RIGHT (w) | −wL²/30 | +wL²/20 |
| VDL_LEFT (w) | −wL²/20 | +wL²/30 |

---

## File: `app/utils/slopeDeflection.ts`

### `generateSlopeDeflectionEquations(spans, fixedEndMoments, sinkingSupports)`

Returns an array of `SlopeDeflectionEquation` objects, one per span:

```typescript
{
  spanLabel: "AB",
  startEquation: "FEM_AB + 2θB·coeff + θC·coeff + δ·term",
  endEquation:   "FEM_BA + θB·coeff + 2θC·coeff + δ·term"
}
```

#### Key logic

1. **Span labels** — Nodes are named A, B, C, D using `String.fromCharCode(65 + index)`.

2. **Base coefficient** — `(2/L) × I_multiplier` — where `I_multiplier` is the relative moment of inertia of the span (1 if I ≤ 1, else the value of I).

3. **θ coefficients**:
   - Near-end coefficient = `2 × base`
   - Far-end coefficient = `1 × base`
   - Fixed ends are omitted (θ = 0 by boundary condition)
   - Hinged/roller ends are included

4. **Displacement (sinking) term** — Chord rotation ψ = (δ_end − δ_start) / L:
   ```
   displacement_term = (2/L) × 3 × ψ × I_multiplier
   ```
   Negative sinking difference → positive term; positive sinking difference → negative term.

5. **Special cases** — Spans with `startSupport === "none"` or `endSupport === "none"` use simplified cantilever-style equations.

---

## File: `app/utils/boundaryCondition.ts`

### `solveSimultaneousEquations(eq1, eq2, eq3, E, I): Solution`

Parses each symbolic equation string to extract coefficients:

```
constants   — purely numeric terms (FEM contributions)
coeffB      — coefficient of EIθB
coeffC      — coefficient of EIθC
coeffD      — coefficient of EIθD (3-equation case)
```

#### Parsing approach
1. Strip whitespace, split on `+`/`−` keeping the delimiter.
2. Reconstruct signed terms.
3. For each term:
   - If it contains `EI` → multiply the numeric prefix by `EI = E × I` to get the actual numerical coefficient
   - Otherwise → add to constants

#### 2-equation case (no θD)
Uses Cramer's Rule on a 2×2 matrix:
```
D  = a11·a22 − a12·a21
θB = (b1·a22 − b2·a12) / D
θC = (a11·b2 − a21·b1) / D
```

#### 3-equation case (with θD)
Uses Cramer's Rule on a 3×3 matrix with cofactor expansion.

Returns `null` if `|D| < 1e-10` (degenerate/unstable structure).

---

## File: `app/utils/calculateFinalMoments.ts`

### `calculateFinalMoments(equations, θB, θC, θD, EI): FinalMoments`

Iterates over the slope-deflection equations and, for each, evaluates both the start and end equation strings with the solved θ values:

```
M_start = constant + coeffB × EI × θB + coeffC × EI × θC + coeffD × EI × θD + EI_term × EI
M_end   = (same pattern for endEquation)
```

The parsing here uses regex patterns to match `([+-]?float)?EIθB` etc. and extract the coefficient. The `EI_term` handles the displacement term which was embedded as a plain `...EI` factor.

Results are stored with keys like `MAB`, `MBA`, `MBC`, `MCB`, `MCD`, `MDC`.

---

## File: `app/utils/calculateReactions.ts`

### `calculateSpanReactions(span, startMoment, endMoment)`

For each load type, takes moments about the start support (A end):

```
ΣM_A = 0:
  − startMoment + R_end × L + endMoment − (load moment about A) = 0
  → R_end = (load moment about A − endMoment − startMoment) / L
  → R_start = total load − R_end
```

Note that the sign convention follows the code's accumulation pattern — the formula is verified by comparing with textbook results.

### `calculateReactions(spans, finalMoments)`

Loops over all spans, calling `calculateSpanReactions` for each, and **accumulates** reactions at the same node using addition. Interior support nodes (e.g. B between span AB and span BC) receive contributions from both spans.

---

## File: `app/utils/calculateBMSF.ts`

### `calculateBMSF(spans, moments)`

For each span:
1. Looks up the start and end moments from the `moments` dictionary.
2. Calls `calculateSpanBMSF` to produce 100-point BM and SF arrays.
3. Calls `calculateSpanReactions` to get the start reaction (needed by `criticalBMSF`).

Returns: `{ results: SpanBMSF[], startReactions: number[], startMoments: number[] }`.

### `calculateSpanBMSF(span, startMoment, endMoment, nPoints)`

Generates `nPoints` (100) x-positions from 0 to L.

At each point x, accumulates:
```
M(x) = M_start + R_A · x   [+ load contributions]
V(x) = R_A                  [+ load contributions]
```

Load contributions are applied in a `switch` on load type:
- **UDL**: subtract `w·x²/2` from BM, `w·x` from SF
- **Point loads**: check `x > load_position`, then subtract `P·(x − pos)` from BM, `P` from SF
- **VDL**: integrate the triangular intensity function

### `calculateMaxBendingMoment(span, startReaction, startMoment, P, L)`

For UDL: solves `V(x) = R_A − w·x = 0` → `x = R_A / w`, then evaluates BM at that x.
For two-point loads: checks shear signs at each segment boundary to find the maximum.

---

## File: `app/utils/criticalBMSF.ts`

### `extractCriticalBMSF(spans, bmsfResults, startReactions, startMoments)`

For each span, picks the following points from the 100-point arrays:

1. **Start of span** — index 0
2. **Load position(s)** — computed from load geometry, converted to array index
3. **End of span** — last index
4. **Maximum BM position** — from `calculateMaxBendingMoment()`, if it exists within the span

Returns `SpanCriticalPoints[]` — each element has `spanLabel` and an array of `{ location, position, bendingMoment, shearForce }` objects, used by the results table in `results.tsx`.
