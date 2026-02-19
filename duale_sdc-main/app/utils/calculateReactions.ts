import { LOAD_TYPES } from "./loadTypes";
import { FinalMoments } from "./calculateFinalMoments";
import { Span } from "@/typings";

export interface Reactions {
  [key: string]: number;
}

export const calculateReactions = (
  spans: Span[],
  finalMoments: FinalMoments
): Reactions => {
  const reactions: Reactions = {};

  spans.forEach((span, index) => {
    const startNode = String.fromCharCode(65 + index);
    const endNode = String.fromCharCode(66 + index);

    // Get moments for current span
    const startMoment = finalMoments[`M${startNode}${endNode}`] || 0;
    const endMoment = finalMoments[`M${endNode}${startNode}`] || 0;

    // Calculate reactions based on load type
    const { startReaction, endReaction } = calculateSpanReactions(
      span,
      startMoment,
      endMoment
    );

    // Accumulate reactions at shared supports and round to whole numbers
    reactions[`R${startNode}`] = Math.round(
      (reactions[`R${startNode}`] || 0) + startReaction
    );
    reactions[`R${endNode}`] = Math.round(
      (reactions[`R${endNode}`] || 0) + endReaction
    );
  });

  return reactions;
};

export const calculateSpanReactions = (
  span: Span,
  startMoment: number,
  endMoment: number
): { startReaction: number; endReaction: number } => {
  const { length: L, loadMagnitude: P, loadType } = span;

  switch (loadType) {
    case LOAD_TYPES.UDL: {
      // Total load = w * L
      const totalLoad = P * L;

      // Take moment about start support (clockwise positive)
      // endMoment + RB*L - wL²/2 - startMoment = 0
      const endReaction = (endMoment + (P * L * L) / 2 + startMoment) / L;

      // Use vertical equilibrium: RA + RB = wL
      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.CENTER_POINT: {
      // Take moment about start support
      // endMoment + RB*L - P*L/2 - startMoment = 0
      const endReaction = (endMoment + (P * L) / 2 + startMoment) / L;
      const startReaction = P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.POINT_AT_DISTANCE: {
      if (!span.pointLoadDistances?.a)
        return { startReaction: 0, endReaction: 0 };

      const a = span.pointLoadDistances.a;
      // Take moment about start support
      // endMoment + RB*L - P*a - startMoment = 0
      const endReaction = (endMoment + P * a + startMoment) / L;
      const startReaction = P - endReaction;
      console.log(endReaction);

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.TWO_POINT_LOADS: {
      // Two equal loads at L/3 and 2L/3
      const load1Distance = L / 3;
      const load2Distance = (2 * L) / 3;

      // Take moment about start support
      // endMoment + RB*L - P*L/3 - P*2L/3 - startMoment = 0
      const endReaction =
        (endMoment + P * (load1Distance + load2Distance) + startMoment) / L;

      // Use vertical equilibrium: RA + RB = 2P
      const startReaction = 2 * P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.THREE_POINT_LOADS: {
      // Three equal loads at L/4, L/2, and 3L/4
      const load1Distance = L / 4;
      const load2Distance = L / 2;
      const load3Distance = (3 * L) / 4;

      // Take moment about start support
      const endReaction =
        (-endMoment +
          P * (load1Distance + load2Distance + load3Distance) +
          startMoment) /
        L;
      const startReaction = 3 * P - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.VDL_RIGHT: {
      // For VDL with highest point on the right end
      // Total load = 0.5 * P * L (area of the triangle)
      const totalLoad = 0.5 * P * L;

      // The centroid of the triangular load is located at L/3 from the right end
      const centroidDistanceFromRight = L / 3;

      // Take moment about start support
      // endMoment + RB*L - totalLoad * (L - centroidDistanceFromRight) - startMoment = 0
      const endReaction =
        (endMoment +
          totalLoad * (L - centroidDistanceFromRight) +
          startMoment) /
        L;

      // Use vertical equilibrium: RA + RB = totalLoad
      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    case LOAD_TYPES.VDL_LEFT: {
      // For VDL with highest point on the left end
      // Total load = 0.5 * P * L (area of the triangle)
      const totalLoad = 0.5 * P * L;

      // The centroid of the triangular load is located at L/3 from the left end
      const centroidDistanceFromLeft = L / 3;

      // Take moment about start support
      // endMoment + RB*L - totalLoad * centroidDistanceFromLeft - startMoment = 0
      const endReaction =
        (endMoment + totalLoad * centroidDistanceFromLeft + startMoment) / L;

      // Use vertical equilibrium: RA + RB = totalLoad
      const startReaction = totalLoad - endReaction;

      return { startReaction, endReaction };
    }

    default:
      return { startReaction: 0, endReaction: 0 };
  }
};
