import { Span, SlopeDeflectionEquation } from "@/typings";

/**
 * Slope-Deflection Equation Generator (Beams)
 *
 * The general slope-deflection equation for a prismatic beam member AB is:
 *
 *   M_AB = FEM_AB + (2EI/L) · (2·θA + θB − 3·ψ)
 *   M_BA = FEM_BA + (2EI/L) · (θA + 2·θB − 3·ψ)
 *
 * where ψ = δ/L is the chord rotation due to differential support settlement.
 *
 * This function builds those equations as *symbolic strings* (e.g.
 * "10.00 + 1.33EIθB + 0.67EIθC − 0.0050EI") so they can be:
 *   1. Displayed to the user as step-by-step working.
 *   2. Parsed by the simultaneous-equation solver (boundaryCondition.ts).
 *   3. Re-evaluated by the final-moment calculator (calculateFinalMoments.ts).
 */

/**
 * Generate symbolic slope-deflection equations for every span.
 *
 * @param spans           Array of beam span descriptors.
 * @param fixedEndMoments Pre-computed FEM results (one per span).
 * @param sinkingSupports Array of settlement values at each node (length = numberOfSpans + 1).
 * @returns               One SlopeDeflectionEquation per span.
 */
export const generateSlopeDeflectionEquations = (
  spans: Span[],
  fixedEndMoments: {
    spanLabel: string;
    startMoment: number;
    endMoment: number;
  }[],
  sinkingSupports: number[]
): SlopeDeflectionEquation[] => {
  const equations: SlopeDeflectionEquation[] = [];

  spans.forEach((span, index) => {
    // Name nodes alphabetically: span 0 → AB, span 1 → BC, span 2 → CD
    const startNode = String.fromCharCode(65 + index);
    const endNode = String.fromCharCode(66 + index);
    const spanLabel = startNode + endNode;

    // Relative stiffness multiplier — spans with I > 1 scale all coefficients
    const mOfI = span.momentOfInertia;
    const EI = "EI";
    const baseCoefficient = mOfI > 1 ? mOfI : 1;

    // 2/L factor (common to all SDE terms), rounded to 2 decimal places
    const evaluatedFraction = (2 / span.length).toFixed(2);

    // -----------------------------------------------------------------------
    // Special case: spans with a free (no-support) end behave like cantilevers
    // and do not follow the standard two-end slope-deflection equation.
    // -----------------------------------------------------------------------
    if (span.startSupport === "none" || span.endSupport === "none") {
      const w = span.loadMagnitude;
      const L = span.length;
      const isUDL = span.loadType === "udl"; // Check if the load type is UDL

      // If start has no support, only show end moment
      if (span.startSupport === "none" && span.endSupport !== "none") {
        equations.push({
          spanLabel,
          startEquation: "", // No equation for unsupported end
          endEquation: isUDL
            ? `${((w * L * L) / 2).toFixed(2)}`
            : `${(-w * L).toFixed(2)}`, // Use UDL formula if applicable
        });
        return;
      }

      // If end has no support, only show start moment
      if (span.endSupport === "none" && span.startSupport !== "none") {
        equations.push({
          spanLabel,
          startEquation: isUDL
            ? `${((w * L * L) / 2).toFixed(2)}`
            : `${(-w * L).toFixed(2)}`, // Use UDL formula if applicable
          endEquation: "", // No equation for unsupported end
        });
        return;
      }

      // If both ends have no support, no moments
      if (span.startSupport === "none" && span.endSupport === "none") {
        equations.push({
          spanLabel,
          startEquation: "",
          endEquation: "",
        });
        return;
      }
    }

    // -----------------------------------------------------------------------
    // Regular case: both ends have defined supports.
    //
    // Near-end coefficient = 2 × baseCoefficient × (2/L)  (appears in front of θ_near)
    // Far-end coefficient  = 1 × baseCoefficient × (2/L)  (appears in front of θ_far)
    //
    // When an end is fixed, its rotation θ = 0 so that term is omitted entirely.
    // -----------------------------------------------------------------------
    const startThetaCoefficient = (
      2 *
      baseCoefficient *
      Number(evaluatedFraction)
    ).toFixed(2);
    const endThetaCoefficient = (
      baseCoefficient * Number(evaluatedFraction)
    ).toFixed(2);

    // Build θ term strings — empty string if the end is fixed (θ = 0)
    const startTheta = span.startSupport === "fixed" ? "" : `θ${startNode}`;
    const endTheta = span.endSupport === "fixed" ? "" : `θ${endNode}`;

    // Helper: returns "coeffEIθX" or "EIθX" (omit coefficient if it equals 1)
    const formatThetaTerm = (coefficient: string, theta: string) => {
      if (!theta) return "";
      const coeff = parseFloat(coefficient);
      return coeff === 1 ? `${EI}${theta}` : `${coefficient}${EI}${theta}`;
    };

    // M_AB start equation θ-terms: 2×coeff·θA + 1×coeff·θB
    const startThetaExpression = [
      formatThetaTerm(startThetaCoefficient, startTheta),
      formatThetaTerm(endThetaCoefficient, endTheta),
    ]
      .filter(Boolean)
      .join(" + ");

    // M_BA end equation θ-terms: 1×coeff·θA + 2×coeff·θB  (near/far swapped)
    const endThetaExpression = [
      formatThetaTerm(endThetaCoefficient, startTheta),
      formatThetaTerm(startThetaCoefficient, endTheta),
    ]
      .filter(Boolean)
      .join(" + ");

    // Retrieve the pre-computed FEM for this span
    const spanFEM = fixedEndMoments.find((fem) => fem.spanLabel === spanLabel);
    const femAB = spanFEM ? spanFEM.startMoment : 0;
    const femBA = spanFEM ? spanFEM.endMoment : 0;

    // -----------------------------------------------------------------------
    // Settlement / sinking support term:
    //   ψ = (δ_end − δ_start) / L
    //   contribution = (2/L) × 3 × ψ × baseCoefficient
    //
    // Positive sinking difference (end sinks more than start) produces a
    // hogging correction → displayed as "− term·EI".
    // -----------------------------------------------------------------------
    const startDelta = sinkingSupports[index];
    const endDelta = sinkingSupports[index + 1];
    const deltaValue = endDelta - startDelta;
    const term =
      (parseFloat(evaluatedFraction) * (3 * deltaValue)) / span.length;
    const displacementTerm =
      term !== 0
        ? term < 0
          ? ` + ${Math.abs(term).toFixed(4)}EI`
          : ` - ${term.toFixed(4)}EI`
        : "";

    equations.push({
      spanLabel,
      // Full SDE: FEM + θ-expression + settlement-term
      startEquation: `${femAB.toFixed(
        2
      )} + ${startThetaExpression}${displacementTerm}`,
      endEquation: `${femBA.toFixed(
        2
      )} + ${endThetaExpression}${displacementTerm}`,
    });
  });

  return equations;
};
