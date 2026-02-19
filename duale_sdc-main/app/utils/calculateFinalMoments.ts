import { SlopeDeflectionEquation } from "@/typings";

export interface FinalMoments {
  [key: string]: number;
}

export const calculateFinalMoments = (
  equations: SlopeDeflectionEquation[],
  thetaB: number,
  thetaC: number,
  thetaD: number,
  EI: number
): FinalMoments => {
  const moments: FinalMoments = {};

  equations.forEach((equation) => {
    // Calculate start moment
    const startCoefficients = parseEquation(equation.startEquation);
    moments[`M${equation.spanLabel.charAt(0)}${equation.spanLabel.charAt(1)}`] =
      calculateMoment(startCoefficients, thetaB, thetaC, thetaD, EI);

    // Calculate end moment
    const endCoefficients = parseEquation(equation.endEquation);
    moments[`M${equation.spanLabel.charAt(1)}${equation.spanLabel.charAt(0)}`] =
      calculateMoment(endCoefficients, thetaB, thetaC, thetaD, EI);
  });

  return moments;
};

interface Coefficients {
  constant: number;
  thetaB: number;
  thetaC: number;
  thetaD: number;
  EI: number;
}

const parseEquation = (equation: string): Coefficients => {
  const coefficients: Coefficients = {
    constant: 0,
    thetaB: 0,
    thetaC: 0,
    thetaD: 0,
    EI: 0,
  };

  // Extract constant term (first number in the equation)
  const constantMatch = equation.match(/^([+-]?\s*\d*\.?\d+)/);
  if (constantMatch) {
    coefficients.constant = parseFloat(constantMatch[1].replace(/\s+/g, ""));
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

  // Extract EI term
  const EIMatch = equation.match(/([+-]\s*\d*\.?\d+)EI(?!θ)/);
  if (EIMatch) {
    coefficients.EI = parseFloat(EIMatch[1].replace(/\s+/g, ""));
  }

  return coefficients;
};

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
