import { FrameSlopeDeflectionEquation } from "./frameSlopeDeflection";

/**
 * Frame Boundary Condition Builder
 *
 * The boundary conditions for a portal frame come from moment equilibrium at
 * the two beam-column joints:
 *
 *   Joint B:  M_C1e + M_BCs = 0  →  sum of moments from C1 top and beam left end
 *   Joint C:  M_BCe + M_C2s = 0  →  sum of moments from beam right end and C2 top
 *
 * When Column 2 has a hinged or roller base, the base moment M_C2e = 0 provides
 * an additional (third) boundary equation for the θD unknown.
 *
 * Both equations are assembled as simplified symbolic strings (EIθ format)
 * so they can be passed to the shear equation solver.
 */

export type FrameSolution = {
  thetaB: number;
  thetaC: number;
  thetaD?: number;
  delta: number;
} | null;

export type BoundaryEquations = {
  eq1: string;
  eq2: string;
  eq3?: string;
} | null;

// ---------------------------------------------------------------------------
// Internal helpers: coefficient formatters
// ---------------------------------------------------------------------------

/**
 * Format a coefficient for display: omit "1" prefix (e.g. "1EIθB" → "EIθB").
 */
const formatCoefficient = (coeff: number): string => {
  const absCoeff = Math.abs(coeff);
  return absCoeff === 1 ? "" : absCoeff.toFixed(2);
};

/**
 * Simplify a combined equation string (θB, θC, EIδ terms only).
 * Used for the standard case where both column bases are fixed (no θD).
 */
const formatEquation = (equation: string): string => {
  const terms = equation
    .replace(/\s+/g, "")
    .split(/([+-])/g)
    .filter(Boolean);

  let coeffB = 0;
  let coeffC = 0;
  let coeffDelta = 0;
  let constants = 0;
  let currentMultiplier = 1;

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];

    if (term === "+" || term === "-") {
      currentMultiplier = term === "+" ? 1 : -1;
      continue;
    }

    if (term.includes("EIθB")) {
      const coeff = parseFloat(term.split("EIθB")[0]) || 1;
      coeffB += coeff * currentMultiplier;
    } else if (term.includes("EIθC")) {
      const coeff = parseFloat(term.split("EIθC")[0]) || 1;
      coeffC += coeff * currentMultiplier;
    } else if (term.includes("EIδ")) {
      const coeff = parseFloat(term.split("EIδ")[0]) || 1;
      coeffDelta += coeff * currentMultiplier;
    } else if (!isNaN(parseFloat(term))) {
      constants += parseFloat(term) * currentMultiplier;
    }
  }

  // Reconstruct a clean signed string from accumulated coefficients
  const parts: string[] = [];

  if (coeffB !== 0) parts.push(`${formatCoefficient(coeffB)}EIθB`);
  if (coeffC !== 0) parts.push(`${formatCoefficient(coeffC)}EIθC`);
  if (coeffDelta !== 0) parts.push(`${formatCoefficient(coeffDelta)}EIδ`);
  if (constants !== 0) parts.push(Math.abs(constants).toFixed(2));

  return parts
    .map((term, index) => {
      if (index === 0) {
        return [coeffB, coeffC, coeffDelta, constants][index] < 0
          ? `-${term}`
          : term;
      }
      const coefficients = [coeffB, coeffC, coeffDelta, constants];
      return coefficients[index] < 0 ? ` - ${term}` : ` + ${term}`;
    })
    .join("");
};

/**
 * Simplify a combined equation string that also contains a θD term.
 * Used for the extended case (hinged/roller Column 2 base).
 */
const formatEquationWithThetaD = (equation: string): string => {
  const terms = equation
    .replace(/\s+/g, "")
    .split(/([+-])/g)
    .filter(Boolean);

  let coeffB = 0;
  let coeffC = 0;
  let coeffD = 0;
  let coeffDelta = 0;
  let constants = 0;
  let currentMultiplier = 1;

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];

    if (term === "+" || term === "-") {
      currentMultiplier = term === "+" ? 1 : -1;
      continue;
    }

    if (term.includes("EIθB")) {
      const coeff = parseFloat(term.split("EIθB")[0]) || 1;
      coeffB += coeff * currentMultiplier;
    } else if (term.includes("EIθC")) {
      const coeff = parseFloat(term.split("EIθC")[0]) || 1;
      coeffC += coeff * currentMultiplier;
    } else if (term.includes("EIθD")) {
      const coeff = parseFloat(term.split("EIθD")[0]) || 1;
      coeffD += coeff * currentMultiplier;
    } else if (term.includes("EIδ")) {
      const coeff = parseFloat(term.split("EIδ")[0]) || 1;
      coeffDelta += coeff * currentMultiplier;
    } else if (!isNaN(parseFloat(term))) {
      constants += parseFloat(term) * currentMultiplier;
    }
  }

  const parts: string[] = [];

  if (coeffB !== 0) parts.push(`${formatCoefficient(coeffB)}EIθB`);
  if (coeffC !== 0) parts.push(`${formatCoefficient(coeffC)}EIθC`);
  if (coeffD !== 0) parts.push(`${formatCoefficient(coeffD)}EIθD`);
  if (coeffDelta !== 0) parts.push(`${formatCoefficient(coeffDelta)}EIδ`);
  if (constants !== 0) parts.push(Math.abs(constants).toFixed(2));

  const result = parts
    .map((term, index) => {
      if (index === 0) {
        return [coeffB, coeffC, coeffD, coeffDelta, constants].filter(
          (c) => c !== 0
        )[0] < 0
          ? `-${term}`
          : term;
      }
      const coefficients = [
        coeffB,
        coeffC,
        coeffD,
        coeffDelta,
        constants,
      ].filter((c) => c !== 0);
      return coefficients[index] < 0 ? ` - ${term}` : ` + ${term}`;
    })
    .join("");

  return result;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build joint equilibrium equations for a standard frame (both bases fixed).
 * Returns eq1 (joint B) and eq2 (joint C) as simplified strings.
 */
export const getFrameBoundaryEquations = (
  equations: FrameSlopeDeflectionEquation[]
): BoundaryEquations => {
  try {
    // Retrieve the relevant sub-equations by member label
    const c1End = equations.find((eq) => eq.memberLabel === "C1")?.endEquation;
    const beamStart = equations.find(
      (eq) => eq.memberLabel === "BC"
    )?.startEquation;
    const beamEnd = equations.find(
      (eq) => eq.memberLabel === "BC"
    )?.endEquation;
    const c2Start = equations.find(
      (eq) => eq.memberLabel === "C2"
    )?.startEquation;

    if (!c1End || !beamStart || !beamEnd || !c2Start) {
      throw new Error("Missing required equations");
    }

    return {
      // Joint B: M_C1e + M_BCs = 0
      eq1: formatEquation(c1End + " + " + beamStart),
      // Joint C: M_BCe + M_C2s = 0
      eq2: formatEquation(beamEnd + " + " + c2Start),
    };
  } catch (error) {
    console.error("Error getting frame equations:", error);
    return null;
  }
};

/**
 * Build joint equilibrium equations for a frame with a non-fixed Column 2 base.
 * May return an optional third equation (M_C2e = 0) when hasHingeOrRoller is true.
 */
export const getFrameBoundaryEquationsExtended = (
  equations: FrameSlopeDeflectionEquation[],
  hasHingeOrRoller: boolean
): BoundaryEquations => {
  try {
    const c1End = equations.find((eq) => eq.memberLabel === "C1")?.endEquation;
    const beamStart = equations.find(
      (eq) => eq.memberLabel === "BC"
    )?.startEquation;
    const beamEnd = equations.find(
      (eq) => eq.memberLabel === "BC"
    )?.endEquation;
    const c2Start = equations.find(
      (eq) => eq.memberLabel === "C2"
    )?.startEquation;
    // End of Column 2 (base moment) — used for the extra equation
    const c2End = equations.find((eq) => eq.memberLabel === "C2")?.endEquation;

    if (!c1End || !beamStart || !beamEnd || !c2Start || !c2End) {
      throw new Error("Missing required equations");
    }

    const baseEquations = {
      eq1: formatEquationWithThetaD(c1End + " + " + beamStart),
      eq2: formatEquationWithThetaD(beamEnd + " + " + c2Start),
    };

    // Third equation: M_C2e = 0  (zero moment at hinged/roller column base)
    if (hasHingeOrRoller && c2End) {
      return {
        ...baseEquations,
        eq3: formatEquationWithThetaD(c2End),
      };
    }

    return baseEquations;
  } catch (error) {
    console.error("Error getting frame equations:", error);
    return null;
  }
};

/**
 * Select and return the appropriate set of boundary equations based on
 * whether any column base is hinged or rollered.
 */
export const generalFrameEquation = (
  equations: FrameSlopeDeflectionEquation[],
  hasHingeOrRoller: boolean
) => {
  return hasHingeOrRoller
    ? getFrameBoundaryEquationsExtended(equations, true)
    : getFrameBoundaryEquations(equations);
};
