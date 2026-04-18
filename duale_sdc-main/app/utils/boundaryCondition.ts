/**
 * Boundary Condition Solver (Beams)
 *
 * After the slope-deflection equations have been generated as symbolic strings,
 * this module:
 *   1. Applies the equilibrium condition ΣM = 0 at each interior joint to
 *      produce a system of simultaneous linear equations in θB, θC, [θD].
 *   2. Solves that system using Cramer's Rule.
 *
 * Cramer's Rule is chosen because it is straightforward to implement for small
 * (2×2 or 3×3) systems and provides exact symbolic determinant expressions.
 */

/**
 * Solved joint rotation values.
 * θD is present only for 3-span beams where the far end is hinged/rollered.
 */
export type Solution = {
  thetaB: number;
  thetaC: number;
  thetaD?: number;
} | null;

/**
 * Parse a symbolic slope-deflection equation string and extract numeric
 * coefficients for each unknown (θB, θC, θD) and the constant term.
 *
 * The equation has the form produced by generateSlopeDeflectionEquations, e.g.:
 *   "10.00 + 1.33EIθB + 0.67EIθC − 0.0050EI"
 *
 * EI is substituted with its numeric value (E × I) so the coefficients become
 * purely numerical, ready for the matrix solver.
 *
 * @param equation - The symbolic equation string.
 * @param EI       - Numeric value of flexural rigidity (E × I).
 */
// Helper function to parse equation terms with EI substitution
const parseEquation = (
  equation: string,
  EI: number
): { constants: number; coeffB: number; coeffC: number; coeffD?: number } => {
  // Step 1: Remove all whitespace, then split on "+" and "−" keeping the
  //         delimiter so we can reconstruct signed terms.
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
      // Terms that contain "EI": the numeric prefix is multiplied by the EI value.
      const withoutEI = term.replace("EI", "");
      if (term.includes("θB")) {
        // e.g. "1.33EIθB" → coefficient = 1.33 × EI
        coeffB += (parseFloat(withoutEI.split("θB")[0]) || 1) * EI;
      } else if (term.includes("θC")) {
        coeffC += (parseFloat(withoutEI.split("θC")[0]) || 1) * EI;
      } else if (term.includes("θD")) {
        coeffD += (parseFloat(withoutEI.split("θD")[0]) || 1) * EI;
      } else {
        // Pure "...EI" term — a settlement contribution with no θ variable
        constants += (parseFloat(withoutEI) || 0) * EI;
      }
    } else {
      // Plain numeric terms (FEM constants and settlement constants)
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

/**
 * Solve the system of simultaneous equilibrium equations for θB, θC, [θD].
 *
 * The equations are the joint-equilibrium conditions ΣM = 0 assembled by
 * the beams page: e.g. for joint B → equation1 = endEquation_AB + startEquation_BC.
 *
 * When only two spans share a common interior joint (typical 3-span beam with
 * fixed far end), equation3 is null and a 2×2 Cramer system is used.
 * When the far end is hinged/rollered, equation3 = endEquation_CD = 0 and a
 * 3×3 Cramer system is needed.
 *
 * @returns Solved θ values, or null if the matrix is singular (unstable structure).
 */
export const solveSimultaneousEquations = (
  equation1: string,
  equation2: string,
  equation3: string | null,
  modulusOfElasticity: number,
  momentOfInertia: number
): Solution => {
  try {
    // EI is rounded to the nearest integer to avoid floating-point noise in coefficients
    const EI = Math.round(modulusOfElasticity * momentOfInertia);
    const eq1 = parseEquation(equation1, EI);
    const eq2 = parseEquation(equation2, EI);

    if (equation3 === null) {
      // -------------------------------------------------------------------
      // 2×2 system:   a11·θB + a12·θC = −b1
      //               a21·θB + a22·θC = −b2
      // Cramer's Rule: θB = Dx/D, θC = Dy/D
      // -------------------------------------------------------------------
      const a11 = eq1.coeffB;
      const a12 = eq1.coeffC;
      const a21 = eq2.coeffB;
      const a22 = eq2.coeffC;

      // Constants move to the right-hand side (negated)
      const b1 = -eq1.constants;
      const b2 = -eq2.constants;

      const D = determinant2x2(a11, a12, a21, a22);

      if (Math.abs(D) < 1e-10) {
        throw new Error(
          "The system has no unique solution (determinant is zero)"
        );
      }

      // Replace the θB column with the RHS vector to get Dx
      const Dx = determinant2x2(b1, a12, b2, a22);
      // Replace the θC column with the RHS vector to get Dy
      const Dy = determinant2x2(a11, b1, a21, b2);

      const thetaB = Dx / D;
      const thetaC = Dy / D;

      return {
        thetaB: thetaB,
        thetaC: thetaC,
      };
    } else {
      // -------------------------------------------------------------------
      // 3×3 system:   a11·θB + a12·θC + a13·θD = −b1
      //               a21·θB + a22·θC + a23·θD = −b2
      //               a31·θB + a32·θC + a33·θD = −b3
      // Cramer's Rule with 3×3 determinants.
      // -------------------------------------------------------------------
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

      // Build numerator matrices by substituting RHS into each column in turn
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
