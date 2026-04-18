import { Column, Beam } from "../frames/types";

/**
 * Slope-Deflection Equation Generator (Frame Members)
 *
 * Extends the beam SDE generator to handle portal frame members:
 *
 * **Columns** include a sway (lateral displacement δ) term because
 * the top of the column can move horizontally relative to the base:
 *
 *   M_col_start = FEM + (2I/L)·EI·2θ_top + (2I/L)·EI·θ_base − (6I/L²)·EI·δ
 *   M_col_end   = FEM + (2I/L)·EI·θ_top + (2I/L)·EI·2θ_base − (6I/L²)·EI·δ
 *
 * **Beams** do not sway (assumed to be axially rigid), so no δ term:
 *
 *   M_BCs = FEM + (2I/L)·EI·2θB + (2I/L)·EI·θC
 *   M_BCe = FEM + (2I/L)·EI·θB  + (2I/L)·EI·2θC
 *
 * All equations are produced as symbolic strings so they can be displayed,
 * added together (frameBoundaryCondition.ts), and then solved (frameShearEquation.ts).
 */

export interface FrameSlopeDeflectionEquation {
  memberLabel: string;  // "C1", "C2", or "BC"
  startEquation: string;
  endEquation: string;
}

/**
 * Generate slope-deflection equations for all frame members.
 *
 * @param columns         The two frame columns.
 * @param beams           The beam(s) connecting the columns.
 * @param fixedEndMoments Pre-computed FEM results labelled as "Column 1", "Column 2", "Beam 1".
 * @returns               One FrameSlopeDeflectionEquation per member.
 */
export const generateFrameSlopeDeflectionEquations = (
  columns: Column[],
  beams: Beam[],
  fixedEndMoments: {
    label: string;
    start: number;
    end: number;
  }[]
): FrameSlopeDeflectionEquation[] => {
  const equations: FrameSlopeDeflectionEquation[] = [];

  // -------------------------------------------------------------------------
  // COLUMNS
  // -------------------------------------------------------------------------
  columns.forEach((column, index) => {
    const columnLabel = `C${index + 1}`;
    const fem = fixedEndMoments.find((m) => m.label === `Column ${index + 1}`);

    // Hinged column base: both FEMs are zero (handled by boundary condition M = 0).
    // We push placeholder equations so the array indices remain consistent.
    if (column.supportType === "hinged") {
      equations.push({
        memberLabel: columnLabel,
        startEquation: "0",
        endEquation: "0",
      });
      return;
    }

    const { length: L, momentOfInertia: I } = column;

    // base coefficient = 2/L  (used as the EI stiffness factor in both terms)
    const baseCoefficient = Number((2 / L).toFixed(2));
    // delta coefficient = 3/L  (for the chord-rotation sway term: 3/L² × L = 3/L)
    const deltaCoeff = Number((3 / L).toFixed(2));

    // -----------------------------------------------------------------------
    // Start equation (moment at the base/bottom of the column)
    // -----------------------------------------------------------------------
    let startEquation = "";
    const femStart = fem?.start || 0;
    if (femStart !== 0) {
      startEquation = `${femStart.toFixed(2)}`;
    }

    // Column 1 (C1): top joint = B (θB unknown), base = A (θA = 0 if fixed)
    if (index === 0) {
      if (column.supportType === "fixed") {
        // Fixed base → θA = 0, so only the near-end (base) coefficient × θB appears
        // Start eq = FEM + 2·baseCoeff·I·EIθB  (near end is base = A)
        startEquation += startEquation
          ? ` + ${(baseCoefficient * I).toFixed(2)}EIθB`
          : `${(baseCoefficient * I).toFixed(2)}EIθB`;
      } else {
        // Non-fixed base (θA ≠ 0) — include both θA and θB
        startEquation += startEquation
          ? ` + ${(2 * baseCoefficient * I).toFixed(2)}EIθA + ${(
              baseCoefficient * I
            ).toFixed(2)}EIθB`
          : `${(2 * baseCoefficient * I).toFixed(2)}EIθA + ${(
              baseCoefficient * I
            ).toFixed(2)}EIθB`;
      }
    }
    // Column 2 (C2): top joint = C (θC unknown), base = D (θD = 0 if fixed, else unknown)
    else if (index === 1) {
      if (column.supportType === "fixed") {
        // Fixed base → θD = 0, only θC appears with 2× coefficient (near end C)
        startEquation += startEquation
          ? ` + ${(2 * baseCoefficient * I).toFixed(2)}EIθC`
          : `${(2 * baseCoefficient * I).toFixed(2)}EIθC`;
      } else {
        // Hinged/roller base (θD is an additional unknown)
        startEquation += startEquation
          ? ` + ${(2 * baseCoefficient * I).toFixed(2)}EIθC + ${(
              baseCoefficient * I
            ).toFixed(2)}EIθD`
          : `${(2 * baseCoefficient * I).toFixed(2)}EIθC + ${(
              baseCoefficient * I
            ).toFixed(2)}EIθD`;
      }
    }
    // Sway term: −(2/L)·(3/L)·I·EIδ = −(6I/L²)·EIδ
    startEquation += ` - ${(baseCoefficient * deltaCoeff * I).toFixed(2)}EIδ`;

    // -----------------------------------------------------------------------
    // End equation (moment at the top of the column, at the beam level)
    // -----------------------------------------------------------------------
    let endEquation = "";
    const femEnd = fem?.end || 0;
    if (femEnd !== 0) {
      endEquation = `${femEnd.toFixed(2)}`;
    }

    // Column 1 (C1) end equation: near end is now the top (B), far end is base (A)
    if (index === 0) {
      if (column.supportType === "fixed") {
        // Fixed base → 2×coeff for near end (B) = top
        endEquation += endEquation
          ? ` + ${(2 * baseCoefficient * I).toFixed(2)}EIθB`
          : `${(2 * baseCoefficient * I).toFixed(2)}EIθB`;
      } else {
        endEquation += endEquation
          ? ` + ${(baseCoefficient * I).toFixed(2)}EIθA + ${(
              2 *
              baseCoefficient *
              I
            ).toFixed(2)}EIθB`
          : `${(baseCoefficient * I).toFixed(2)}EIθA + ${(
              2 *
              baseCoefficient *
              I
            ).toFixed(2)}EIθB`;
      }
    }
    // Column 2 (C2) end equation: near end is C (top), far end is D (base)
    else if (index === 1) {
      if (column.supportType === "fixed") {
        // Fixed base → only θC with 1× coefficient (far end is D = 0)
        endEquation += endEquation
          ? ` + ${(baseCoefficient * I).toFixed(2)}EIθC`
          : `${(baseCoefficient * I).toFixed(2)}EIθC`;
      } else {
        endEquation += endEquation
          ? ` + ${(baseCoefficient * I).toFixed(2)}EIθC + ${(
              2 *
              baseCoefficient *
              I
            ).toFixed(2)}EIθD`
          : `${(baseCoefficient * I).toFixed(2)}EIθC + ${(
              2 *
              baseCoefficient *
              I
            ).toFixed(2)}EIθD`;
      }
    }
    // Same sway term as the start equation
    endEquation += ` - ${(baseCoefficient * deltaCoeff * I).toFixed(2)}EIδ`;

    equations.push({
      memberLabel: columnLabel,
      startEquation,
      endEquation,
    });
  });

  // -------------------------------------------------------------------------
  // BEAMS
  // Beams connect joint B (left column top) to joint C (right column top).
  // No sway term — beams are treated as axially inextensible horizontal members.
  // -------------------------------------------------------------------------
  beams.forEach((beam, index) => {
    const beamLabel = `BC`; // Single beam label for the connecting beam
    const fem = fixedEndMoments.find((m) => m.label === `Beam ${index + 1}`);

    const { length: L, momentOfInertia: I } = beam;
    const baseCoefficient = Number((2 / L).toFixed(2));

    // Start equation: M_BCs = FEM + 2·(2/L)·I·EIθB + (2/L)·I·EIθC
    let startEquation = "";
    const femStart = fem?.start || 0;
    if (femStart !== 0) {
      startEquation = `${femStart.toFixed(2)}`;
    }

    startEquation += startEquation
      ? ` + ${(2 * baseCoefficient * I).toFixed(2)}EIθB + ${(
          baseCoefficient * I
        ).toFixed(2)}EIθC`
      : `${(2 * baseCoefficient * I).toFixed(2)}EIθB + ${(
          baseCoefficient * I
        ).toFixed(2)}EIθC`;

    // End equation: M_BCe = FEM + (2/L)·I·EIθB + 2·(2/L)·I·EIθC
    let endEquation = "";
    const femEnd = fem?.end || 0;
    if (femEnd !== 0) {
      endEquation = `${femEnd.toFixed(2)}`;
    }

    endEquation += endEquation
      ? ` + ${(baseCoefficient * I).toFixed(2)}EIθB + ${(
          2 *
          baseCoefficient *
          I
        ).toFixed(2)}EIθC`
      : `${(baseCoefficient * I).toFixed(2)}EIθB + ${(
          2 *
          baseCoefficient *
          I
        ).toFixed(2)}EIθC`;

    equations.push({
      memberLabel: beamLabel,
      startEquation,
      endEquation,
    });
  });

  return equations;
};
