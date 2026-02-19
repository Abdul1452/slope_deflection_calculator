import { FrameSlopeDeflectionEquation } from "./frameSlopeDeflection";

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

// Helper function to format coefficients (shared between both formatters)
const formatCoefficient = (coeff: number): string => {
  const absCoeff = Math.abs(coeff);
  return absCoeff === 1 ? "" : absCoeff.toFixed(2);
};

// Original format equation function for θB and θC equations
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

// New format equation function for θD equations
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

export const getFrameBoundaryEquations = (
  equations: FrameSlopeDeflectionEquation[]
): BoundaryEquations => {
  // Changed return type from { eq1: string; eq2: string } | null to BoundaryEquations
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

    if (!c1End || !beamStart || !beamEnd || !c2Start) {
      throw new Error("Missing required equations");
    }

    return {
      eq1: formatEquation(c1End + " + " + beamStart),
      eq2: formatEquation(beamEnd + " + " + c2Start),
    };
  } catch (error) {
    console.error("Error getting frame equations:", error);
    return null;
  }
};

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
    const c2End = equations.find((eq) => eq.memberLabel === "C2")?.endEquation;

    if (!c1End || !beamStart || !beamEnd || !c2Start || !c2End) {
      throw new Error("Missing required equations");
    }

    const baseEquations = {
      eq1: formatEquationWithThetaD(c1End + " + " + beamStart),
      eq2: formatEquationWithThetaD(beamEnd + " + " + c2Start),
    };

    // Add third equation if there's a hinge or roller, using the new formatter
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

export const generalFrameEquation = (
  equations: FrameSlopeDeflectionEquation[],
  hasHingeOrRoller: boolean
) => {
  return hasHingeOrRoller
    ? getFrameBoundaryEquationsExtended(equations, true)
    : getFrameBoundaryEquations(equations);
};
