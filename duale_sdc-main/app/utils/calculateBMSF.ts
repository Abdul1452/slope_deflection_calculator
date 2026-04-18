import { LOAD_TYPES } from "./loadTypes";
import { calculateSpanReactions } from "./calculateReactions";
import { Span } from "@/typings";

/**
 * Bending Moment and Shear Force Diagram Data (Beams)
 *
 * For each beam span, this module computes BM and SF at 100 evenly-spaced
 * positions from x=0 to x=L, using the known start reaction and end moments.
 *
 * The approach is a standard section-cut integration from the left:
 *   M(x) = M_start + R_A·x  − [load contributions from 0 to x]
 *   V(x) = R_A              − [load contributions from 0 to x]
 */

/** Number of data points generated per span for a smooth diagram. */
const numberOfPoints = 100;

export interface BMSFResult {
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

export interface SpanBMSF {
  spanLabel: string;
  results: BMSFResult;
}

/**
 * Compute BM/SF data arrays for all spans and collect per-span start reactions.
 *
 * @param spans   Array of beam spans.
 * @param moments Dictionary of final member-end moments { MAB, MBA, MBC, … }.
 * @returns       { results, startReactions, startMoments }
 *                — results: one SpanBMSF per span
 *                — startReactions: R_A for each span (used by criticalBMSF)
 *                — startMoments: M_start for each span (used by criticalBMSF)
 */
export const calculateBMSF = (
  spans: Span[],
  moments: { [key: string]: number }
) => {
  const startReactions: number[] = [];
  const startMoments: number[] = [];
  const results = spans.map((span, index) => {
    const startNode = String.fromCharCode(65 + index);
    const endNode = String.fromCharCode(66 + index);
    const spanLabel = startNode + endNode;

    // Retrieve member-end moments for this span from the final moments dictionary
    const startMoment = moments[`M${startNode}${endNode}`] || 0;
    const endMoment = moments[`M${endNode}${startNode}`] || 0;

    const results = calculateSpanBMSF(
      span,
      startMoment,
      endMoment,
      numberOfPoints
    );

    // Also compute the start reaction for this span (needed by criticalBMSF)
    const { startReaction, endReaction } = calculateSpanReactions(
      span,
      startMoment,
      endMoment
    );

    startReactions.push(startReaction);
    startMoments.push(startMoment);
    return { spanLabel, results };
  });
  return { results, startReactions, startMoments };
};

/**
 * Generate 100-point BM and SF arrays for a single span.
 *
 * Algorithm (section-cut from left):
 *   1. Start with M = M_start + R_A·x and V = R_A.
 *   2. For each load type, subtract the load-induced contribution as x passes
 *      each load position.
 *
 * @param span          The span to analyse.
 * @param startMoment   Member-end moment at the start (left) node, kN·m.
 * @param endMoment     Member-end moment at the end (right) node, kN·m.
 * @param numberOfPoints Number of sample points (100).
 */
const calculateSpanBMSF = (
  span: Span,
  startMoment: number,
  endMoment: number,
  numberOfPoints: number
): BMSFResult => {
  const { length: L, loadMagnitude: P, loadType } = span;
  const dx = L / (numberOfPoints - 1);
  const x: number[] = Array.from({ length: numberOfPoints }, (_, i) => i * dx);
  const bendingMoment: number[] = [];
  const shearForce: number[] = [];

  // Compute the start reaction first (needed for every x evaluation)
  const { startReaction, endReaction } = calculateSpanReactions(
    span,
    startMoment,
    endMoment
  );

  x.forEach((xi) => {
    let M = 0;
    let V = 0;

    // Base values from the start support reaction and applied moment
    M = startMoment + startReaction * xi;
    V = startReaction;

    // Subtract the contribution of the applied load at this section position
    switch (loadType) {
      case LOAD_TYPES.UDL:
        // UDL adds a parabolic BM and linear SF variation:
        //   ΔM = −w·x²/2,   ΔV = −w·x
        M -= (P * xi * xi) / 2;
        V -= P * xi;
        break;

      case LOAD_TYPES.CENTER_POINT:
        // Step change in SF and linear BM change after the load point
        if (xi > L / 2) {
          M -= P * (xi - L / 2);
          V -= P;
        }
        break;

      case LOAD_TYPES.POINT_AT_DISTANCE:
        // Load at distance a from the left end
        if (span.pointLoadDistances?.a && xi > span.pointLoadDistances.a) {
          M -= P * (xi - span.pointLoadDistances.a);
          V -= P;
        }
        break;

      case LOAD_TYPES.TWO_POINT_LOADS:
        // Two loads at x1 = L/3 and x2 = 2L/3
        const x1 = L / 3;
        const x2 = (2 * L) / 3;
        if (xi > x1) {
          M -= P * (xi - x1);
          V -= P;
        }
        if (xi > x2) {
          M -= P * (xi - x2);
          V -= P;
        }
        break;

      case LOAD_TYPES.THREE_POINT_LOADS:
        // Three loads at L/4, L/2, and 3L/4
        const pos1 = L / 4;
        const pos2 = L / 2;
        const pos3 = (3 * L) / 4;
        if (xi > pos1) {
          M -= P * (xi - pos1);
          V -= P;
        }
        if (xi > pos2) {
          M -= P * (xi - pos2);
          V -= P;
        }
        if (xi > pos3) {
          M -= P * (xi - pos3);
          V -= P;
        }
        break;

      case LOAD_TYPES.NONE:
        // No applied load — M and V unchanged beyond the reaction term
        break;

      case LOAD_TYPES.VDL_RIGHT: {
        // Triangular load: zero at x=0, maximum w=P at x=L.
        // Intensity at position x: q(x) = (P/L)·x
        // ∫₀ˣ q(t)·(x−t) dt = w·x³/6  (BM contribution)
        // ∫₀ˣ q(t) dt       = w·x²/2  (SF contribution)
        const w0 = 0; // Initial intensity
        const w1 = P; // Final intensity
        const w = (w1 - w0) / L; // Rate of increase per unit length
        M -= (w * xi * xi * xi) / 6;
        V -= (w * xi * xi) / 2;
        break;
      }

      case LOAD_TYPES.VDL_LEFT: {
        // Triangular load: maximum w=P at x=0, zero at x=L.
        // Intensity at position x: q(x) = P − (P/L)·x
        const w1 = P; // Initial (maximum) intensity
        const w0 = 0; // Final intensity
        const w = (w0 - w1) / L; // Rate of decrease (negative slope)
        M -= (w * xi * xi * xi) / 6 + (w1 * xi * xi) / 2;
        V -= (w * xi * xi) / 2 + w1 * xi;
        break;
      }
    }

    bendingMoment.push(M);
    shearForce.push(V);
  });

  return {
    x,
    bendingMoment,
    shearForce,
  };
};

/**
 * Analytically locate the position and value of the maximum bending moment
 * within a span for load types that allow a closed-form solution.
 *
 * The maximum BM occurs where the shear force V(x) = 0.
 *
 * @param span          The span being analysed.
 * @param startReaction Vertical reaction at the start support (R_A).
 * @param startMoment   Moment at the start support (M_AB).
 * @param P             Load magnitude.
 * @param L             Span length.
 * @returns             { position, maxBendingMoment } or null if max is not within span.
 */
export const calculateMaxBendingMoment = (
  span: Span,
  startReaction: number,
  startMoment: number,
  P: number,
  L: number
): { position: number; maxBendingMoment: number } | null => {
  // Only calculate if shear force changes sign
  switch (span.loadType) {
    case LOAD_TYPES.UDL:
      {
        // V(x) = R_A − w·x = 0  →  x = R_A / w
        const x = startReaction / P;
        if (x > 0 && x < L) {
          // M(x) = R_A·x − (w·x²)/2 + M_start
          const maxBM = startReaction * x - (P * x * x) / 2 + startMoment;
          return { position: x, maxBendingMoment: maxBM };
        }
      }
      break;

    case LOAD_TYPES.TWO_POINT_LOADS:
      {
        // Check segment boundaries for sign change in V
        const x1 = L / 3;
        const x2 = (2 * L) / 3;
        if (startReaction > 0) {
          // Positive shear in first segment → max BM at first load position
          const maxBM = startReaction * x1 + startMoment;
          return { position: x1, maxBendingMoment: maxBM };
        }
        // Check shear in second segment
        const V1 = startReaction - P;
        if (V1 > 0) {
          const maxBM = startReaction * x2 - P * (x2 - x1) + startMoment;
          return { position: x2, maxBendingMoment: maxBM };
        }
      }
      break;
  }
  return null;
};
