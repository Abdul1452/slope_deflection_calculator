import { LOAD_TYPES } from "./loadTypes";
import { FinalMoments } from "./calculateFinalMoments";
import { Span } from "@/typings";

/**
 * Support Reaction Calculator (Beams)
 *
 * Given the final member-end moments (from calculateFinalMoments) and the
 * applied loading on each span, this module computes the vertical support
 * reactions using **moment equilibrium** about one support.
 *
 * For a span AB with moments M_AB (at A) and M_BA (at B):
 *
 *   ΣM_A = 0:   R_B × L − M_BA − M_AB − (load moment about A) = 0
 *   → R_B = (M_AB + M_BA + load moment about A) / L
 *   → R_A = total vertical load − R_B
 *
 * At intermediate supports (e.g. joint B between spans AB and BC) the
 * reaction accumulates contributions from both adjacent spans.
 */

export interface Reactions {
  [key: string]: number;
}

/**
 * Compute support reactions for all spans of the continuous beam.
 * Accumulates reactions at shared interior nodes (e.g. joint B gets a
 * contribution from span AB and a contribution from span BC).
 *
 * @param spans        Array of span descriptors.
 * @param finalMoments Dictionary of solved member-end moments (e.g. { MAB, MBA, ... }).
 * @returns            Dictionary of reactions rounded to whole numbers (e.g. { RA, RB, RC, RD }).
 */
export const calculateReactions = (
  spans: Span[],
  finalMoments: FinalMoments
): Reactions => {
  const reactions: Reactions = {};

  spans.forEach((span, index) => {
    const startNode = String.fromCharCode(65 + index); // A, B, C, ...
    const endNode = String.fromCharCode(66 + index);   // B, C, D, ...

    const startMoment = finalMoments[`M${startNode}${endNode}`] || 0;
    const endMoment = finalMoments[`M${endNode}${startNode}`] || 0;

    const { startReaction, endReaction } = calculateSpanReactions(
      span,
      startMoment,
      endMoment
    );

    // Accumulate — interior support nodes receive contributions from two spans.
    // Round to whole numbers for clean display.
    reactions[`R${startNode}`] = Math.round(
      (reactions[`R${startNode}`] || 0) + startReaction
    );
    reactions[`R${endNode}`] = Math.round(
      (reactions[`R${endNode}`] || 0) + endReaction
    );
  });

  return reactions;
};

/**
 * Compute start and end reactions for a single span using moment equilibrium.
 *
 * @param span        The span descriptor.
 * @param startMoment M at the left (start) support, kN·m.
 * @param endMoment   M at the right (end) support, kN·m.
 * @returns           { startReaction, endReaction } in kN.
 */
export const calculateSpanReactions = (
  span: Span,
  startMoment: number,
  endMoment: number
): { startReaction: number; endReaction: number } => {
  const { length: L, loadMagnitude: P, loadType } = span;

  switch (loadType) {
    case LOAD_TYPES.UDL: {
      // Total load = w × L  (w is load per unit length, stored in P)
      const totalLoad = P * L;

      // ΣM_A = 0:  R_B × L − wL²/2 − M_BA + M_AB = 0  (using sign convention)
      // → R_B = (wL²/2 + M_BA + M_AB) / L
      const endReaction = (endMoment + (P * L * L) / 2 + startMoment) / L;

      // ΣV = 0:  R_A = wL − R_B
      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.CENTER_POINT: {
      // Single point load P at L/2.
      // ΣM_A = 0:  R_B × L − P × L/2 − M_BA + M_AB = 0
      const endReaction = (endMoment + (P * L) / 2 + startMoment) / L;
      const startReaction = P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.POINT_AT_DISTANCE: {
      if (!span.pointLoadDistances?.a)
        return { startReaction: 0, endReaction: 0 };

      const a = span.pointLoadDistances.a; // Distance from start to load
      // ΣM_A = 0:  R_B × L − P × a − M_BA + M_AB = 0
      const endReaction = (endMoment + P * a + startMoment) / L;
      const startReaction = P - endReaction;
      console.log(endReaction);

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.TWO_POINT_LOADS: {
      // Two equal loads P at L/3 and 2L/3.
      const load1Distance = L / 3;
      const load2Distance = (2 * L) / 3;

      // ΣM_A = 0:  R_B × L − P × L/3 − P × 2L/3 − M_BA + M_AB = 0
      const endReaction =
        (endMoment + P * (load1Distance + load2Distance) + startMoment) / L;

      // ΣV = 0:  R_A = 2P − R_B
      const startReaction = 2 * P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.THREE_POINT_LOADS: {
      // Three equal loads P at L/4, L/2, and 3L/4.
      const load1Distance = L / 4;
      const load2Distance = L / 2;
      const load3Distance = (3 * L) / 4;

      const endReaction =
        (endMoment +
          P * (load1Distance + load2Distance + load3Distance) +
          startMoment) /
        L;
      const startReaction = 3 * P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.VDL_RIGHT: {
      // Triangular load increasing to the right.
      // Total load = 0.5 × P × L (area of triangle)
      const totalLoad = 0.5 * P * L;

      // Centroid of the triangle is at L/3 from the heavy end (right = B),
      // or equivalently at 2L/3 from the left end (A).
      const centroidDistanceFromRight = L / 3;

      // ΣM_A = 0:  R_B × L − totalLoad × (L − L/3) − M_BA + M_AB = 0
      const endReaction =
        (endMoment +
          totalLoad * (L - centroidDistanceFromRight) +
          startMoment) /
        L;

      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.VDL_LEFT: {
      // Triangular load increasing to the left.
      // Total load = 0.5 × P × L
      const totalLoad = 0.5 * P * L;

      // Centroid is at L/3 from the heavy end (left = A).
      const centroidDistanceFromLeft = L / 3;

      // ΣM_A = 0:  R_B × L − totalLoad × L/3 − M_BA + M_AB = 0
      const endReaction =
        (endMoment + totalLoad * centroidDistanceFromLeft + startMoment) / L;

      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    default:
      return { startReaction: 0, endReaction: 0 };
  }
};
