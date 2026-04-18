# UI Components Reference

This document describes every React component in the application, its props, and its behaviour.

---

## Root-level components

### `app/layout.tsx` — Root Layout

Wraps all pages. Applies:
- `Inter` font from Google Fonts
- `<ThemeProvider>` — dark mode support (attribute `class`, default `system`)
- `<Navbar>` — fixed top bar
- `<main className="pt-16">` — content area offset below navbar

**Metadata**: title `"Duale-SDC"`, description `"Calculate beams & frames"`.

---

### `app/components/theme-provider.tsx`

A thin pass-through wrapper around `NextThemesProvider`.

**Props**: all props accepted by `NextThemesProvider` (forwarded via rest spread).

**Purpose**: allows the root layout to be a Server Component while keeping the theme provider as a `"use client"` component in its own file.

---

### `app/components/navbar.tsx`

Fixed top navigation bar (`position: fixed`, z-index 50, frosted glass background).

**Dependencies**: `usePathname()`, `useTheme()`, Framer Motion `motion.div`.

**Behaviour**:
- Slides in from the top with a Framer Motion animation on mount (`y: -100 → 0`).
- Active route (beams / frames) is highlighted in indigo via a conditional class.
- Theme toggle button cycles between `"dark"` and `"light"` by calling `setTheme()`.
- The Sun/Moon icons use CSS transforms to rotate/scale in and out of view based on the current theme.

---

## Beams page components

### `app/components/span-inputs.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `span` | `Span` | Current span data |
| `index` | `number` | Zero-based span index (used to generate the span label, e.g. "AB") |
| `onChange` | `(span: Span) => void` | Called whenever any field changes |

Renders one bordered card for a span containing:
1. **Length** — number input (m)
2. **I** — moment of inertia number input
3. **Start Support** — Radix Select (hinged / roller / fixed / none)
4. **End Support** — Radix Select (hinged / roller / fixed / none)
5. **Load Type** — Radix Select (populated from `LOAD_TYPE_LABELS`)
6. **Load Magnitude** — number input (label shows `(w)` for UDL, `(P)` otherwise)
7. **Point load distances a / b** — shown only when `loadType === "point-at-distance"`

Internally uses an `updateSpan(field, value)` helper that merges changes into the span object before calling `onChange`.

---

### `app/components/results.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `results` | `FixedEndMomentResults[]` | FEM per span |
| `equations` | `SlopeDeflectionEquation[]` | Symbolic SDE strings |
| `boundaryCondition` | `Solution` | Solved θB, θC, θD |
| `finalMoments` | `{ [key: string]: number }` | Member-end moments |
| `reactions` | `{ [key: string]: number }` | Support reactions |
| `criticalPoints` | `SpanCriticalPoints[]` | Notable BMSF points |

Renders the complete analysis result in six animated sections (each uses Framer Motion reveal with a staggered `delay`):
1. Fixed End Moments per span
2. Slope-Deflection Equations per span
3. Boundary Conditions (θB, θC, θD values)
4. Final Moments table
5. Support Reactions table
6. Critical BM/SF table + `<BMSFCharts>`

---

### `app/components/bmsf-charts.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `criticalPoints` | `SpanCriticalPoints[]` | All spans' critical BMSF data |

Combines all spans' critical points into one sorted array, maps them to Recharts data format `{ position, shearForce, bendingMoment }`, and renders two `<AreaChart>` components:

| Chart | Data key | Colour | `type` |
|-------|----------|--------|--------|
| Shear Force Diagram | `shearForce` | Blue (`rgb(53,162,235)`) | `"linear"` |
| Bending Moment Diagram | `bendingMoment` | Red (`rgb(255,99,132)`) | `"monotone"` |

Both charts share:
- Responsive container (full width, 450px height)
- X-axis: `position (m)` — tick marks at each critical point
- Y-axis: labelled with units (kN or kNm)
- `<Tooltip>` for hover values
- `isAnimationActive={false}` to avoid animation interference with the parent Framer Motion animations

---

## Frames page components

### `app/components/frame-forms/column-form.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `columns` | `Column[]` | Array of column objects |
| `onColumnChange` | `(index, field, value) => void` | Partial update callback |

Renders one card per column with:
- Length (m)
- Moment of Inertia
- Support Type (fixed / hinged / roller / none) — uses `FRAME_FRAME_LOAD_TYPES` options
- Load Type (none / centre-point)
- Load Magnitude (kN) — shown only when load type ≠ NONE

---

### `app/components/frame-forms/beam-form.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `beams` | `Beam[]` | Array of beam objects |
| `onBeamChange` | `(index, field, value) => void` | Partial update callback |

Renders one card per beam with:
- Length (m)
- Moment of Inertia (m⁴)
- Load Type (none / UDL / centre-point / point at distance)
- Load Magnitude (kN/m for UDL, kN otherwise) — shown when load type ≠ NONE
- Point load distances a and b — shown only when `loadType === "POINT_AT_DISTANCE"`

---

### `app/components/fr-results.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `results` | `CalculationResults` | Complete frame analysis output |

Renders all result sections in a stacked layout using `ResultCard` and `SectionTitle` helper components defined inline. Sections:
1. Fixed End Moments — Columns
2. Fixed End Moments — Beams
3. Slope Deflection Equations per member
4. Boundary Equations (eq1, eq2, optional eq3)
5. Shear Equation (simplified + solved unknowns EIθB, EIθC, EIθD, EIδ)
6. Final Moments dictionary
7. Horizontal Reactions (H1, H2)
8. Vertical Reactions (RA, RD)
9. Column BMSF Values (per section)
10. Beam BMSF Values — for UDL only start/end shown; for other load types all section points shown

**Display heuristic**: `bmsf.x.length === 21` → UDL (21 evenly-spaced points); otherwise → point load case (3–4 points).

---

### `app/components/frame-sf-diagram.tsx`

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `results` | `CalculationResults` | Frame analysis output |

Renders an inline SVG (800×600 viewBox) with:
- Dashed white centrelines for each column and the beam
- Filled blue paths representing shear force areas
- Shear force magnitude labels at start, end, and zero-shear points

**Layout constants**:
```
columnWidth = frameWidth × 0.3   (30% of available width each side)
beamHeight  = frameHeight × 0.3  (30% of available height)
```

**Path generation** (`generateColumnPath`): maps x (height along column) to y pixel coordinate using `heightScale`, and shear force to horizontal offset from the centreline using `columnShearScale`. Closes the path back along the centreline to form a filled polygon.

**Path generation** (`generateBeamPath`): maps x (position along beam) to pixel x, and shear force to vertical offset from the beam centreline.

---

### `app/components/frame-bm-diagram.tsx`

**Props**: identical to `frame-sf-diagram.tsx`.

Same SVG structure as the SFD component but renders bending moment data in purple (`#a855f7`) with a purple-gradient fill.

**Direction convention**: column moment paths are drawn inward (toward the frame interior):
- Column 1 (left): positive moment → rightward offset
- Column 2 (right): positive moment → leftward offset (note the `−1` multiplier in the code vs `+1` for the SFD)

Beam moment paths extend downward for positive moments (sagging convention).

---

## shadcn/ui primitives (`components/ui/`)

These are generated by `shadcn-ui add` and should not be edited manually. They are thin, accessible wrappers around Radix UI primitives with Tailwind CVA variants.

### `button.tsx`
```typescript
ButtonProps: {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean  // renders as child element instead of <button>
}
```

### `card.tsx`
Exports `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` — semantic `div` wrappers with consistent padding and border styling.

### `input.tsx`
Styled `<input>` with focus ring, disabled state, and file-input variant via Tailwind.

### `label.tsx`
`@radix-ui/react-label` wrapper with peer-disabled styling.

### `select.tsx`
Full Radix Select component composition: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.

---

## `lib/utils.ts`

```typescript
function cn(...inputs: ClassValue[]): string
```

Combines class strings using `clsx` (supports conditional/array syntax) and then deduplicates conflicting Tailwind utility classes using `tailwind-merge`.

**Usage example**:
```typescript
cn("px-4 py-2", isActive && "bg-indigo-600", "px-2")
// → "py-2 bg-indigo-600 px-2"  (tailwind-merge resolves px-4 vs px-2)
```
