import { Column } from "../frames/types";
import { FrameSlopeDeflectionEquation } from "./frameSlopeDeflection";

export interface ShearEquationResult {
  shearEquation: string;
}

export interface SimplifiedEquationResult {
  simplifiedEquation: string;
  coefficients: {
    thetaB?: number;
    thetaC?: number;
    thetaD?: number;
    delta?: number;
    constant: number;
  };
}

export interface EquationSolution {
  thetaB: number;
  thetaC: number;
  thetaD: number;
  delta: number;
}

export const generateFrameShearEquation = (
  columns: Column[],
  equations: FrameSlopeDeflectionEquation[]
): ShearEquationResult => {
  const h1 = columns[0]?.length || 0;
  const h2 = columns[1]?.length || 0;

  const c1Equations = equations.find((eq) => eq.memberLabel === "C1");
  const c2Equations = equations.find((eq) => eq.memberLabel === "C2");

  if (!c1Equations || !c2Equations) {
    throw new Error("Missing column equations");
  }

  let column1Component = "";
  const c1LoadMagnitude = columns[0]?.loadMagnitude || 0;
  const c1CenterPointTerm =
    columns[0]?.loadType === "CENTER_POINT"
      ? ` - ${(c1LoadMagnitude * (h1 / 2)).toFixed(2)}`
      : "";

  column1Component =
    columns[0].supportType === "fixed"
      ? `(${c1Equations.startEquation} + ${
          c1Equations.endEquation
        }${c1CenterPointTerm})/${h1.toFixed(2)}`
      : `(${c1Equations.endEquation})/${h1.toFixed(2)}`;

  let column2Component = "";
  const c2LoadMagnitude = columns[1]?.loadMagnitude || 0;
  const c2CenterPointTerm =
    columns[1]?.loadType === "CENTER_POINT"
      ? ` - ${(c2LoadMagnitude * (h2 / 2)).toFixed(2)}`
      : "";

  column2Component =
    columns[1].supportType === "fixed"
      ? `(${c2Equations.startEquation} + ${
          c2Equations.endEquation
        }${c2CenterPointTerm})/${h2.toFixed(2)}`
      : `(${c2Equations.startEquation})/${h2.toFixed(2)}`;
  console.log(column2Component);

  const totalLoadMagnitude =
    (columns[0]?.loadType !== "NONE" ? c1LoadMagnitude : 0) +
    (columns[1]?.loadType !== "NONE" ? c2LoadMagnitude : 0);

  const shearEquation = `${column1Component} + ${column2Component} + ${totalLoadMagnitude} = 0`;

  return {
    shearEquation,
  };
};

export const simplifyFrameShearEquation = (
  shearEquation: string
): SimplifiedEquationResult => {
  try {
    let equation = shearEquation.replace(/\s+/g, "").replace("=0", "");
    const regex = /\([^)]+\)\/[\d.]+|\d+/g;
    const mainComponents = equation.match(regex);

    let thetaBCoeff = 0;
    let thetaCCoeff = 0;
    let thetaDCoeff = 0;
    let deltaCoeff = 0;
    let constant = 0;

    mainComponents?.forEach((component) => {
      if (component.includes("/")) {
        const [expression, divisor] = component.split("/");
        const div = parseFloat(divisor);
        const terms = expression.slice(1, -1).match(/[+-]?[^+-]+/g) || [];

        terms.forEach((term) => {
          if (term.includes("EIθB")) {
            const coeff = parseFloat(term.replace("EIθB", "")) / div;
            thetaBCoeff += coeff;
          } else if (term.includes("EIθC")) {
            const coeff = parseFloat(term.replace("EIθC", "")) / div;
            thetaCCoeff += coeff;
          } else if (term.includes("EIθD")) {
            const coeff = parseFloat(term.replace("EIθD", "")) / div;
            thetaDCoeff += coeff;
          } else if (term.includes("EIδ")) {
            const coeff = parseFloat(term.replace("EIδ", "")) / div;
            deltaCoeff += coeff;
          } else {
            const value = parseFloat(term) / div;
            constant += value;
          }
        });
      } else {
        constant += parseFloat(component);
      }
    });

    thetaBCoeff = Number(thetaBCoeff.toFixed(2));
    thetaCCoeff = Number(thetaCCoeff.toFixed(2));
    thetaDCoeff = Number(thetaDCoeff.toFixed(2));
    deltaCoeff = Number(deltaCoeff.toFixed(2));
    constant = Number(constant.toFixed(2));

    const parts: string[] = [];
    if (thetaBCoeff !== 0) parts.push(`${thetaBCoeff}EIθB`);
    if (thetaCCoeff !== 0)
      parts.push(
        `${thetaCCoeff > 0 ? " + " : " - "}${Math.abs(thetaCCoeff)}EIθC`
      );
    if (thetaDCoeff !== 0)
      parts.push(
        `${thetaDCoeff > 0 ? " + " : " - "}${Math.abs(thetaDCoeff)}EIθD`
      );
    if (deltaCoeff !== 0)
      parts.push(`${deltaCoeff > 0 ? " + " : " - "}${Math.abs(deltaCoeff)}EIδ`);

    const simplifiedEquation = `${parts.join("")} = ${-constant}`;

    return {
      simplifiedEquation,
      coefficients: {
        thetaB: thetaBCoeff,
        thetaC: thetaCCoeff,
        thetaD: thetaDCoeff,
        delta: deltaCoeff,
        constant: -constant,
      },
    };
  } catch (error: any) {
    throw new Error(`Failed to simplify equation: ${error.message}`);
  }
};

const solveFrameEquationsWithThetaD = (
  boundaryEq1: string,
  boundaryEq2: string,
  boundaryEq3: string,
  shearEq: string
): EquationSolution => {
  try {
    const parseEquation = (
      eq: string,
      implicitZero: boolean = false
    ): number[] => {
      const [left, right] = implicitZero
        ? [eq, "0"]
        : eq.split("=").map((s) => s.trim());
      let rightNum = parseFloat(right);

      let thetaB = 0,
        thetaC = 0,
        thetaD = 0,
        delta = 0;
      const terms =
        left.match(
          /[+-]?\s*\d*\.?\d*EIθ[BCD]|[+-]?\s*\d*\.?\d*EIδ|[+-]?\s*\d+\.?\d*(?!EI)/g
        ) || [];

      terms.forEach((term) => {
        const cleanTerm = term.replace(/\s+/g, "");
        const isNegative = cleanTerm.startsWith("-");
        const coeff = parseFloat(cleanTerm) || (isNegative ? -1 : 1);

        if (term.includes("EIθB")) {
          thetaB = isNegative ? -Math.abs(coeff) : coeff;
        } else if (term.includes("EIθC")) {
          thetaC = isNegative ? -Math.abs(coeff) : coeff;
        } else if (term.includes("EIθD")) {
          thetaD = isNegative ? -Math.abs(coeff) : coeff;
        } else if (term.includes("EIδ")) {
          delta = isNegative ? -Math.abs(coeff) : coeff;
        } else {
          rightNum -= coeff;
        }
      });

      return [thetaB, thetaC, thetaD, delta, rightNum];
    };

    // Solve 4x4 matrix
    const matrix = [
      parseEquation(boundaryEq1, true),
      parseEquation(boundaryEq2, true),
      parseEquation(boundaryEq3, true),
      parseEquation(shearEq, false),
    ];

    // Check matrix condition
    const determinant = calculateDeterminant(matrix);
    if (Math.abs(determinant) < 1e-10) {
      console.warn("Warning: Matrix may be ill-conditioned");
    }

    const solution = solveMatrix(matrix, 4);

    return solution;
  } catch (error: any) {
    console.error("Error in solveFrameEquationsWithThetaD:", error);
    throw new Error(`Failed to solve equations with θD: ${error.message}`);
  }
};

// Add helper function to calculate determinant for 4x4 matrix
const calculateDeterminant = (matrix: number[][]): number => {
  const n = matrix.length;
  if (n !== 4) return 0;

  let det = 0;
  for (let i = 0; i < 4; i++) {
    det += matrix[0][i] * getCofactor(matrix, 0, i);
  }
  return det;
};

const getCofactor = (matrix: number[][], row: number, col: number): number => {
  const subMatrix: number[][] = [];
  for (let i = 1; i < 4; i++) {
    const tempRow: number[] = [];
    for (let j = 0; j < 4; j++) {
      if (j !== col) {
        tempRow.push(matrix[i][j]);
      }
    }
    if (tempRow.length > 0) {
      subMatrix.push(tempRow);
    }
  }

  const sign = col % 2 === 0 ? 1 : -1;
  return sign * determinant3x3(subMatrix);
};

const determinant3x3 = (matrix: number[][]): number => {
  return (
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
  );
};

const solveFrameEquationsWithoutThetaD = (
  boundaryEq1: string,
  boundaryEq2: string,
  shearEq: string
): EquationSolution => {
  try {
    const parseEquation = (
      eq: string,
      implicitZero: boolean = false
    ): number[] => {
      const [left, right] = implicitZero
        ? [eq, "0"]
        : eq.split("=").map((s) => s.trim());
      let rightNum = parseFloat(right);

      let thetaB = 0,
        thetaC = 0,
        delta = 0;
      const terms =
        left.match(
          /[+-]?\s*\d*\.?\d*EIθ[BC]|[+-]?\s*\d*\.?\d*EIδ|[+-]?\s*\d+\.?\d*(?!EI)/g
        ) || [];

      terms.forEach((term) => {
        const cleanTerm = term.replace(/\s+/g, "");
        const isNegative = cleanTerm.startsWith("-");
        const coeff = parseFloat(cleanTerm) || (isNegative ? -1 : 1);

        if (term.includes("EIθB")) thetaB = coeff;
        else if (term.includes("EIθC")) thetaC = coeff;
        else if (term.includes("EIδ")) delta = coeff;
        else rightNum -= coeff;
      });

      return [thetaB, thetaC, delta, rightNum];
    };

    // Solve 3x3 matrix
    const matrix = [
      parseEquation(boundaryEq1, true),
      parseEquation(boundaryEq2, true),
      parseEquation(shearEq, false),
    ];

    const solution = solveMatrix(matrix, 3);
    return {
      ...solution,
      thetaD: 0,
    };
  } catch (error: any) {
    throw new Error(`Failed to solve equations without θD: ${error.message}`);
  }
};

// Helper function to solve matrix using Gaussian elimination
const solveMatrix = (matrix: number[][], size: number): EquationSolution => {
  const n = matrix.length;

  // Gaussian elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    if (maxRow !== i) {
      [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    }

    const pivot = matrix[i][i];
    if (Math.abs(pivot) < 1e-10) {
      throw new Error("No unique solution exists");
    }

    for (let j = i; j <= size; j++) {
      matrix[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = matrix[k][i];
        for (let j = i; j <= size; j++) {
          matrix[k][j] -= factor * matrix[i][j];
        }
      }
    }
  }

  if (size === 4) {
    return {
      thetaB: Number(matrix[0][4].toFixed(4)),
      thetaC: Number(matrix[1][4].toFixed(4)),
      thetaD: Number(matrix[2][4].toFixed(4)),
      delta: Number(matrix[3][4].toFixed(4)),
    };
  } else {
    return {
      thetaB: Number(matrix[0][3].toFixed(4)),
      thetaC: Number(matrix[1][3].toFixed(4)),
      thetaD: 0,
      delta: Number(matrix[2][3].toFixed(4)),
    };
  }
};

export const solveFrameEquations = (
  boundaryEq1: string,
  boundaryEq2: string,
  boundaryEq3: string | null,
  shearEq: string
): EquationSolution => {
  if (boundaryEq3) {
    return solveFrameEquationsWithThetaD(
      boundaryEq1,
      boundaryEq2,
      boundaryEq3,
      shearEq
    );
  } else {
    return solveFrameEquationsWithoutThetaD(boundaryEq1, boundaryEq2, shearEq);
  }
};
