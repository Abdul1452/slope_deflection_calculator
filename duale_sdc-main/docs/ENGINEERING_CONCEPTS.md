# Engineering Concepts

This document explains the structural engineering theory behind the **Slope Deflection Calculator**. Understanding these concepts helps make sense of every calculation step in the code.

---

## 1. What Is the Slope-Deflection Method?

The **slope-deflection method** is a classical *displacement-based* technique for analysing statically indeterminate beams and frames. It was developed in the early 20th century and remains a foundational method in structural analysis.

The method works by:
1. Writing an equation for the **moment at each end of every member**, expressed in terms of unknown joint rotations (θ) and, for frames, lateral sway (δ).
2. Applying **equilibrium conditions** at each joint (ΣM = 0) to generate a system of simultaneous equations.
3. **Solving** the system to find the θ (and δ) values.
4. **Back-substituting** the solved values to obtain actual moment magnitudes at every member end.

---

## 2. The General Slope-Deflection Equation

For a prismatic beam member AB of length *L* and flexural rigidity *EI*, the moment at the **near end** A is:

```
M_AB = FEM_AB + (2EI/L) · (2·θA + θB − 3·ψ)
```

And at the **far end** B:

```
M_BA = FEM_BA + (2EI/L) · (θA + 2·θB − 3·ψ)
```

Where:

| Symbol | Meaning |
|--------|---------|
| `FEM_AB` | Fixed-end moment at A due to applied loads (assuming both ends fixed) |
| `θA`, `θB` | Rotations at joints A and B (positive = clockwise) |
| `ψ = δ/L` | Chord rotation — relative transverse displacement divided by member length |
| `EI/L` | Flexural stiffness of the member |

### Fixed-end behaviour
- If end A is **fixed**: θA = 0 → the θA term drops out
- If end A is **pinned/hinged/roller**: the moment at A = 0, which allows us to write a modified equation or use it as a boundary condition

---

## 3. Fixed-End Moments (FEM)

Fixed-end moments are the moments produced at the ends of a fully fixed-fixed beam by the applied load. The standard formulas are:

### UDL (uniformly distributed load, intensity *w*, full span *L*)

```
FEM_AB = −wL² / 12        (hogging at A, negative by convention)
FEM_BA = +wL² / 12        (sagging at B, positive by convention)
```

### Centre point load (*P* at midspan *L/2*)

```
FEM_AB = −PL / 8
FEM_BA = +PL / 8
```

### Point load at distance *a* from A, *b* from B (a + b = L)

```
FEM_AB = −P·b²·a / L²
FEM_BA = +P·b·a² / L²
```

### Two equal point loads at *L/3* and *2L/3*

```
FEM_AB = −2PL / 9
FEM_BA = +2PL / 9
```

### Three equal point loads at *L/4*, *L/2*, *3L/4*

```
FEM_AB = −15PL / 48
FEM_BA = +15PL / 48
```

### Triangular load (VDL) — increasing to the right (zero at A, max *w* at B)

```
FEM_AB = −wL² / 30
FEM_BA = +wL² / 20
```

### Triangular load (VDL) — increasing to the left (max *w* at A, zero at B)

```
FEM_AB = −wL² / 20        (note: signs are from the code convention)
FEM_BA = +wL² / 30
```

---

## 4. Boundary Conditions

At every **interior joint**, the sum of all moments from the meeting members must equal zero (moment equilibrium):

```
ΣM at joint B = M_AB_end + M_BC_start = 0
ΣM at joint C = M_BC_end + M_CD_start = 0
```

For a 3-span beam (joints A, B, C, D) this gives two equations in two unknowns (θB, θC), or three equations if the final support is pinned/hinged (adding M_CD_end = 0).

Each equation is assembled symbolically as a string like:

```
"10.00 + 1.33EIθB + 0.67EIθC + 5.00 + 0.50EIθB + 1.00EIθC"
```

…and then parsed to extract numeric coefficients for Cramer's Rule.

---

## 5. Solving the System — Cramer's Rule (Beams)

For a 2-unknown system:

```
a11·θB + a12·θC = −b1
a21·θB + a22·θC = −b2
```

Cramer's Rule gives:

```
θB = det([b1, a12; b2, a22]) / det([a11, a12; a21, a22])
θC = det([a11, b1; a21, b2]) / det([a11, a12; a21, a22])
```

If the determinant is zero (singular matrix) the structure is either unstable or the inputs are inconsistent — the code returns `null` and displays an error.

---

## 6. Frames — Sway (Lateral Displacement δ)

In portal frames, the beam connecting the columns may sway horizontally. This introduces an additional unknown **δ** (the horizontal displacement at the beam level).

For columns:
```
M_col = FEM + (2EI/h) · (2·θ_top + θ_base − 3·δ/h)
```

The sway term `−3·(EI/h)·(δ/h)` = `−(3EI/h²)·δ` is included in both start and end column equations.

The additional equation needed to solve for δ comes from **horizontal equilibrium** of the entire frame:

```
H₁ + H₂ + P_horizontal = 0
```

where H_i is the horizontal reaction at the base of column i, related to the column moments by:

```
H_i = (M_top + M_base ± P·h/2) / h
```

---

## 7. Solving the System — Gaussian Elimination (Frames)

The frame system (3 or 4 unknowns: θB, θC, optional θD, δ) is solved by **Gaussian elimination with partial pivoting** on an augmented matrix.

The process:
1. For each pivot row, find the row with the largest absolute value in the pivot column (partial pivoting for numerical stability).
2. Divide the pivot row by the pivot element to make the diagonal = 1.
3. Eliminate the pivot column from all other rows by subtracting multiples of the pivot row.
4. Read off the solution from the last column of the reduced matrix.

---

## 8. Support Reactions

After final moments are known, reactions are found by **moment equilibrium about one support**:

For a span AB with start moment M_AB and end moment M_BA:

```
ΣM_A = 0:   R_B · L − M_BA − M_AB − (load effect) = 0
→  R_B = (M_BA + M_AB + load moment about A) / L
→  R_A = total load − R_B
```

At **intermediate supports**, contributions from both adjacent spans are accumulated (a shared support receives reactions from the left span and the right span).

---

## 9. Bending Moment and Shear Force Diagrams

### Continuous integration approach (beams)
Starting from the start support with known reaction R_A and moment M_AB, BM and SF at any position x along the span are calculated by superimposing:

- The reaction contribution: `M(x) = M_start + R_A · x`, `V(x) = R_A`
- The load contribution (subtracted as the load is traversed):
  - UDL: `−w·x²/2` for BM, `−w·x` for SF
  - Point load: step change in SF and linear change in BM after the load position
  - VDL: triangular function integration

The code samples 100 evenly-spaced points per span to generate smooth diagram curves.

### Critical points
The structurally important points extracted are:
- **Start and end** of each span (support positions)
- **Load application** positions (point loads, including at L/3, L/2, 2L/3, 3L/4 etc.)
- **Zero-shear position** — where V = 0, which locates the maximum bending moment for UDL and two-point-load cases

---

## 10. Sign Convention

The code follows the **clockwise-positive** sign convention for moments throughout:
- Hogging moments at the left end of a fixed-fixed beam (FEM_AB) are **negative**
- Sagging moments at the right end (FEM_BA) are **positive**
- Reactions are positive upward
- Horizontal reactions in frames are positive in the direction assumed when writing the shear equation
