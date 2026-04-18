import { SlopeDeflectionEquation } from "@/typings";

/**
 * Final Moment Calculator (Beams)
 *
 * Once the simultaneous equations are solved and the joint rotations (θB, θC, θD)
 * are known, this module substitutes those values back into every slope-deflection
 * equation to obtain the actual numerical moments at each member end.
 *
 * Result format:   { MAB: number, MBA: number, MBC: number, MCB: number, ... }
 * Units: kN·m  (consistent with inputs in kN and m)
 */

export interface FinalMoments {
  [key: string]: number;
}

/**
 * Evaluate all slope-deflection equations to produce final member-end moments.
 *
 * @param equations - Symbolic SDE strings produced by generateSlopeDeflectionEquations.
 * @param thetaB    - Solved rotation at joint B (radians, from the solver).
 * @param thetaC    - Solved rotation at joint C.
 * @param thetaD    - Solved rotation at joint D (0 if not applicable).
 * @param EI        - Numeric flexural rigidity (E × I).
 * @returns         A dictionary of member-end moments, keyed as "MAB", "MBA", etc.
 */
export const calculateFinalMoments = (
  equations: SlopeDeflectionEquation[],
  thetaB: number,
  thetaC: number,
  thetaD: number,
  EI: number
): FinalMoments => {
  const moments: FinalMoments = {};

  equations.forEach((equation) => {
    // Parse the equation string to get numeric coefficients
    const startCoefficients = parseEquation(equation.startEquation);
    // Store with key "M{startNode}{endNode}", e.g. "MAB"
    moments[`M${equation.spanLabel.charAt(0)}${equation.spanLabel.charAt(1)}`] =
      calculateMoment(startCoefficients, thetaB, thetaC, thetaD, EI);

    const endCoefficients = parseEquation(equation.endEquation);
    // Store with key "M{endNode}{startNode}", e.g. "MBA"
    moments[`M${equation.spanLabel.charAt(1)}${equation.spanLabel.charAt(0)}`] =
      calculateMoment(endCoefficients, thetaB, thetaC, thetaD, EI);
  });

  return moments;
};

/**
 * Coefficients extracted from a single slope-deflection equation string.
 * Each field represents the multiplier of that variable (or plain constant).
 */
interface Coefficients {
  constant: number; // FEM + settlement constant
  thetaB: number;   // Coefficient of (EI × θB)
  thetaC: number;   // Coefficient of (EI × θC)
  thetaD: number;   // Coefficient of (EI × θD)
  EI: number;       // Coefficient of plain EI (settlement term)
}

/**
 * Parse a symbolic SDE string into numeric coefficient fields.
 *
 * Handled term patterns:
 *   "FEM"               → constant (e.g. "10.00")
 *   "coeff EIθB"        → thetaB coefficient
 *   "coeff EIθC"        → thetaC coefficient
 *   "coeff EIθD"        → thetaD coefficient
 *   "coeff EI"          → plain EI term (settlement contribution, no θ variable)
 */
const parseEquation = (equation: string): Coefficients => {
  const coefficients: Coefficients = {
    constant: 0,
    thetaB: 0,
    thetaC: 0,
    thetaD: 0,
    EI: 0,
  };

  // Extract the leading numeric constant term (the FEM value)
  const constantMatch = equation.match(/^([+-]?\s*\d*\.?\d+)/);
  if (constantMatch) {
    coefficients.constant = parseFloat(constantMatch[1].replace(/\s+/g, ""));
  }

  // Extract θB coefficient — matches optional signed float followed by "EIθB"
  if (equation.includes("EIθB")) {
    const thetaBMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθB/);
    const coefficient = thetaBMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaB = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract θC coefficient
  if (equation.includes("EIθC")) {
    const thetaCMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθC/);
    const coefficient = thetaCMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaC = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract θD coefficient
  if (equation.includes("EIθD")) {
    const thetaDMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθD/);
    const coefficient = thetaDMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaD = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract the plain "EI" term (no θ variable) — the settlement displacement term.
  // The lookbehind (?!θ) ensures we don't match the θ-variable terms again.
  const EIMatch = equation.match(/([+-]\s*\d*\.?\d+)EI(?!θ)/);
  if (EIMatch) {
    coefficients.EI = parseFloat(EIMatch[1].replace(/\s+/g, ""));
  }

  return coefficients;
};

/**
 * Evaluate one member-end moment by substituting the solved θ values.
 *
 * M = constant + coeffB·EI·θB + coeffC·EI·θC + coeffD·EI·θD + EI_term·EI
 */
const calculateMoment = (
  coefficients: Coefficients,
  thetaB: number,
  thetaC: number,
  thetaD: number,
  EI: number
): number => {
  return (
    coefficients.constant +
    coefficients.thetaB * EI * thetaB +
    coefficients.thetaC * EI * thetaC +
    coefficients.thetaD * EI * thetaD +
    coefficients.EI * EI
  );
};
