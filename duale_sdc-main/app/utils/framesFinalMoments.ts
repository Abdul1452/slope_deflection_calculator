import { FrameSlopeDeflectionEquation } from "./frameSlopeDeflection";
import { Column, Beam } from "../frames/types";

export interface FrameFinalMoments {
  [key: string]: number;
}

interface Coefficients {
  constant: number;
  thetaB: number;
  thetaC: number;
  thetaD: number; // Add thetaD
  delta: number;
}

export const calculateFrameFinalMoments = (
  equations: FrameSlopeDeflectionEquation[],
  columns: Column[], // Add columns parameter
  thetaB: number,
  thetaC: number,
  thetaD: number, // Add thetaD parameter
  delta: number,
  EI: number
): FrameFinalMoments => {
  const moments: FrameFinalMoments = {};

  equations.forEach((equation) => {
    // Calculate start moment
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

    // Calculate end moment - check if it's a non-fixed column end
    const endMomentKey = `M${equation.memberLabel}e`;
    if (equation.memberLabel.startsWith("C")) {
      const columnIndex = parseInt(equation.memberLabel.charAt(1)) - 1;
      const column = columns[columnIndex];

      if (column && column.supportType !== "fixed") {
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

const parseFrameEquation = (equation: string): Coefficients => {
  const coefficients: Coefficients = {
    constant: 0,
    thetaB: 0,
    thetaC: 0,
    thetaD: 0, // Initialize thetaD
    delta: 0,
  };

  // Extract constant terms (standalone numbers not part of EI terms)
  const constantMatches = equation.match(
    /(?<!EI.*)([+-]?\s*\d*\.?\d+)(?!\s*EI|\s*\.?\d*\s*EI)/g
  );
  if (constantMatches) {
    coefficients.constant = constantMatches
      .map((num) => parseFloat(num.replace(/\s+/g, "")))
      .reduce((sum, num) => sum + num, 0);
  }

  // Extract θB coefficient
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

  // Extract δ coefficient
  if (equation.includes("EIδ")) {
    const deltaMatch = equation.match(/([+-]?\s*\d*\.?\d+)?EIδ/);
    const coefficient = deltaMatch?.[1]?.replace(/\s+/g, "");
    coefficients.delta = coefficient ? parseFloat(coefficient) : 1;
  }

  return coefficients;
};

const calculateFrameMoment = (
  coefficients: Coefficients,
  thetaB: number,
  thetaC: number,
  thetaD: number, // Add thetaD parameter
  delta: number,
  EI: number
): number => {
  return (
    coefficients.constant +
    coefficients.thetaB * thetaB +
    coefficients.thetaC * thetaC +
    coefficients.thetaD * thetaD + // Add thetaD term
    coefficients.delta * delta
  );
};
