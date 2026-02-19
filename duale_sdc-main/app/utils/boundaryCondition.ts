export type Solution = {
  thetaB: number;
  thetaC: number;
  thetaD?: number;
} | null;

// Helper function to parse equation terms with EI substitution
const parseEquation = (
  equation: string,
  EI: number
): { constants: number; coeffB: number; coeffC: number; coeffD?: number } => {
  const terms = equation
    .replace(/\s+/g, "") // Remove all whitespace first
    .split(/([+-])/) // Split on + or - and keep the delimiters
    .filter((term) => term !== "") // Remove empty strings
    .reduce(
      (acc, curr) => {
        // Reconstruct terms with their signs
        if (curr === "+" || curr === "-") {
          acc.sign = curr;
        } else {
          acc.terms.push(acc.sign + curr);
        }
        return acc;
      },
      { sign: "", terms: [] as string[] }
    )
    .terms.map((term) => (term.startsWith("+") ? term.slice(1) : term)); // Remove leading + signs

  let constants = 0;
  let coeffB = 0;
  let coeffC = 0;
  let coeffD = 0;

  terms.forEach((term) => {
    if (term.includes("EI")) {
      // Handle terms with EI
      const withoutEI = term.replace("EI", "");
      if (term.includes("θB")) {
        coeffB += (parseFloat(withoutEI.split("θB")[0]) || 1) * EI;
      } else if (term.includes("θC")) {
        coeffC += (parseFloat(withoutEI.split("θC")[0]) || 1) * EI;
      } else if (term.includes("θD")) {
        coeffD += (parseFloat(withoutEI.split("θD")[0]) || 1) * EI;
      } else {
        constants += (parseFloat(withoutEI) || 0) * EI;
      }
    } else {
      // Handle terms without EI
      if (term.includes("θB")) {
        coeffB += parseFloat(term.split("θB")[0]) || 1;
      } else if (term.includes("θC")) {
        coeffC += parseFloat(term.split("θC")[0]) || 1;
      } else if (term.includes("θD")) {
        coeffD += parseFloat(term.split("θD")[0]) || 1;
      } else if (term !== "0") {
        constants += parseFloat(term) || 0;
      }
    }
  });

  return { constants, coeffB, coeffC, coeffD };
};

// Helper function to calculate determinant of 2x2 matrix
const determinant2x2 = (
  a11: number,
  a12: number,
  a21: number,
  a22: number
): number => {
  return a11 * a22 - a12 * a21;
};

// Helper function to calculate determinant of 3x3 matrix
const determinant3x3 = (matrix: number[][]): number => {
  return (
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
  );
};

export const solveSimultaneousEquations = (
  equation1: string,
  equation2: string,
  equation3: string | null,
  modulusOfElasticity: number,
  momentOfInertia: number
): Solution => {
  try {
    const EI = Math.round(modulusOfElasticity * momentOfInertia);
    const eq1 = parseEquation(equation1, EI);
    const eq2 = parseEquation(equation2, EI);

    if (equation3 === null) {
      // Solve 2x2 matrix using Cramer's Rule
      const a11 = eq1.coeffB;
      const a12 = eq1.coeffC;
      const a21 = eq2.coeffB;
      const a22 = eq2.coeffC;

      const b1 = -eq1.constants;
      const b2 = -eq2.constants;

      const D = determinant2x2(a11, a12, a21, a22);

      if (Math.abs(D) < 1e-10) {
        throw new Error(
          "The system has no unique solution (determinant is zero)"
        );
      }

      const Dx = determinant2x2(b1, a12, b2, a22);
      const Dy = determinant2x2(a11, b1, a21, b2);

      const thetaB = Dx / D;
      const thetaC = Dy / D;

      return {
        thetaB: thetaB,
        thetaC: thetaC,
      };
    } else {
      // Solve 3x3 matrix using Cramer's Rule
      const eq3 = parseEquation(equation3, EI);

      const matrix = [
        [eq1.coeffB, eq1.coeffC, eq1.coeffD || 0],
        [eq2.coeffB, eq2.coeffC, eq2.coeffD || 0],
        [eq3.coeffB, eq3.coeffC, eq3.coeffD || 0],
      ];

      const constants = [-eq1.constants, -eq2.constants, -eq3.constants];

      const D = determinant3x3(matrix);

      if (Math.abs(D) < 1e-10) {
        throw new Error(
          "The system has no unique solution (determinant is zero)"
        );
      }

      // Calculate determinants for each variable
      const Dx = determinant3x3([
        [constants[0], matrix[0][1], matrix[0][2]],
        [constants[1], matrix[1][1], matrix[1][2]],
        [constants[2], matrix[2][1], matrix[2][2]],
      ]);

      const Dy = determinant3x3([
        [matrix[0][0], constants[0], matrix[0][2]],
        [matrix[1][0], constants[1], matrix[1][2]],
        [matrix[2][0], constants[2], matrix[2][2]],
      ]);

      const Dz = determinant3x3([
        [matrix[0][0], matrix[0][1], constants[0]],
        [matrix[1][0], matrix[1][1], constants[1]],
        [matrix[2][0], matrix[2][1], constants[2]],
      ]);

      return {
        thetaB: Dx / D,
        thetaC: Dy / D,
        thetaD: Dz / D,
      };
    }
  } catch (error) {
    console.error("Error solving equations:", error);
    return null;
  }
};
