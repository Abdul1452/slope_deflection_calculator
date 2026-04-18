import { FrameSlopeDeflectionEquation } from "./frameSlopeDeflection";
import { Column, Beam } from "../frames/types";

/**
 * Frame Final Moment Calculator
 *
 * Once θB, θC, θD, and δ are solved, this module substitutes those values
 * back into every frame slope-deflection equation to obtain the actual
 * numerical member-end moments (kN·m).
 *
 * Moment key convention:
 *   - "MC1s" — moment at the start (base) of Column 1
 *   - "MC1e" — moment at the end (top) of Column 1
 *   - "MBCs" — moment at the start (B end) of the Beam
 *   - "MBCe" — moment at the end (C end) of the Beam
 *   - "MC2s" — moment at the start (top) of Column 2
 *   - "MC2e" — moment at the end (base) of Column 2
 *
 * Special rule: for non-fixed column bases, the far-end (base) moment is
 * forced to zero because the boundary condition M = 0 applies at a pin/roller.
 */

export interface FrameFinalMoments {
  [key: string]: number;
}

interface Coefficients {
  constant: number;
  thetaB: number;
  thetaC: number;
  thetaD: number;
  delta: number;
}

/**
 * Evaluate all frame slope-deflection equations to produce final moments.
 *
 * @param equations  Symbolic SDE strings per member.
 * @param columns    Column descriptors (needed to check support type).
 * @param thetaB     Solved EI·θB value (units: kN·m²).
 * @param thetaC     Solved EI·θC value.
 * @param thetaD     Solved EI·θD value (0 if both bases are fixed).
 * @param delta      Solved EI·δ value (sway).
 * @param EI         Flexural rigidity (pass 1 when θ values are already in EI·θ form).
 * @returns          Dictionary of member-end moments.
 */
export const calculateFrameFinalMoments = (
  equations: FrameSlopeDeflectionEquation[],
  columns: Column[],
  thetaB: number,
  thetaC: number,
  thetaD: number,
  delta: number,
  EI: number
): FrameFinalMoments => {
  const moments: FrameFinalMoments = {};

  equations.forEach((equation) => {
    // Evaluate the start-of-member moment
    const startCoefficients = parseFrameEquation(equation.startEquation);
    const startMomentKey = `M${equation.memberLabel}s`;
    moments[startMomentKey] = calculateFrameMoment(
      startCoefficients,
      thetaB,
      thetaC,
      thetaD,
      delta,
      EI
    );

    // Evaluate the end-of-member moment.
    // For column members with a non-fixed base, the base moment is forced to 0
    // (boundary condition: moment at a pin/roller = 0).
    const endMomentKey = `M${equation.memberLabel}e`;
    if (equation.memberLabel.startsWith("C")) {
      const columnIndex = parseInt(equation.memberLabel.charAt(1)) - 1;
      const column = columns[columnIndex];

      if (column && column.supportType !== "fixed") {
        // Pin/roller base → moment must be zero
        moments[endMomentKey] = 0;
      } else {
        const endCoefficients = parseFrameEquation(equation.endEquation);
        moments[endMomentKey] = calculateFrameMoment(
          endCoefficients,
          thetaB,
          thetaC,
          thetaD,
          delta,
          EI
        );
      }
    } else {
      // Beam — evaluate normally
      const endCoefficients = parseFrameEquation(equation.endEquation);
      moments[endMomentKey] = calculateFrameMoment(
        endCoefficients,
        thetaB,
        thetaC,
        thetaD,
        delta,
        EI
      );
    }
  });

  return moments;
};

/**
 * Parse a symbolic frame SDE string into numeric coefficient fields.
 * Recognises EIθB, EIθC, EIθD, EIδ and plain numeric (FEM) terms.
 */
const parseFrameEquation = (equation: string): Coefficients => {
  const coefficients: Coefficients = {
    constant: 0,
    thetaB: 0,
    thetaC: 0,
    thetaD: 0,
    delta: 0,
  };

  // Extract standalone numeric constants (FEM values not attached to any EI term)
  const constantMatches = equation.match(
    /(?<!EI.*)([+-]?\s*\d*\.?\d+)(?!\s*EI|\s*\.?\d*\s*EI)/g
  );
  if (constantMatches) {
    coefficients.constant = constantMatches
      .map((num) => parseFloat(num.replace(/\s+/g, "")))
      .reduce((sum, num) => sum + num, 0);
  }

  // Extract EIθB coefficient
  if (equation.includes("EIθB")) {
    const thetaBMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθB/);
    const coefficient = thetaBMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaB = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract EIθC coefficient
  if (equation.includes("EIθC")) {
    const thetaCMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθC/);
    const coefficient = thetaCMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaC = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract EIθD coefficient
  if (equation.includes("EIθD")) {
    const thetaDMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIθD/);
    const coefficient = thetaDMatch?.[1]?.replace(/\s+/g, "");
    coefficients.thetaD = coefficient ? parseFloat(coefficient) : 1;
  }

  // Extract EIδ (sway) coefficient
  if (equation.includes("EIδ")) {
    const deltaMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIδ/);
    const coefficient = deltaMatch?.[1]?.replace(/\s+/g, "");
    coefficients.delta = coefficient ? parseFloat(coefficient) : 1;
  }

  return coefficients;
};

/**
 * Evaluate one member-end moment:
 *   M = constant + coeffB·θB + coeffC·θC + coeffD·θD + coeffDelta·δ
 *
 * Note: when the solver returns EI·θ values (not plain θ), EI should be passed
 * as 1 so the values are not double-multiplied.
 */
const calculateFrameMoment = (
  coefficients: Coefficients,
  thetaB: number,
  thetaC: number,
  thetaD: number,
  delta: number,
  EI: number
): number => {
  return (
    coefficients.constant +
    coefficients.thetaB * thetaB +
    coefficients.thetaC * thetaC +
    coefficients.thetaD * thetaD +
    coefficients.delta * delta
  );
};
