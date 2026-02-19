import { Column, Beam } from "../frames/types";
import { FrameFinalMoments } from "./framesFinalMoments";

export interface FrameReactions {
  [key: string]: number;
}

export const calculateFrameHorizontalReactions = (
  columns: Column[],
  finalMoments: FrameFinalMoments
): FrameReactions => {
  const reactions: FrameReactions = {};

  columns.forEach((column, index) => {
    const columnLabel = `C${index + 1}`;
    const startMoment = finalMoments[`M${columnLabel}s`] || 0;
    const endMoment = finalMoments[`M${columnLabel}e`] || 0;
    const height = column.length;

    let horizontalReaction = 0;

    if (column.loadType === "CENTER_POINT") {
      // For point load at center: H = (Ms + Me - P*h/2) / h
      horizontalReaction =
        (startMoment + endMoment - (column.loadMagnitude * height) / 2) /
        height;
    } else {
      // For no load or other types: H = (Ms + Me) / h
      horizontalReaction = (startMoment + endMoment) / height;
    }

    // Store the horizontal reaction with the label H1, H2, etc.
    reactions[`H${index + 1}`] = Number(horizontalReaction.toFixed(2));
  });

  return reactions;
};

export const calculateFrameVerticalReactions = (
  beams: Beam[],
  finalMoments: FrameFinalMoments
): FrameReactions => {
  const reactions: FrameReactions = {};

  beams.forEach((beam, index) => {
    const { length: L, loadMagnitude: P, loadType } = beam;

    // Get start and end moments from final moments
    // For beam between columns, it would be MBCs and MBCe
    const startMoment = finalMoments[`MBCs`] || 0;
    const endMoment = finalMoments[`MBCe`] || 0;

    let startReaction = 0;
    let endReaction = 0;

    switch (loadType) {
      case "UDL": {
        // Total load = w * L
        const totalLoad = P * L;

        // Take moment about start support (clockwise positive)
        // endMoment + RB*L - wL²/2 - startMoment = 0
        endReaction = (endMoment + (P * L * L) / 2 + startMoment) / L;

        // Use vertical equilibrium: RA + RB = wL
        startReaction = totalLoad - endReaction;
        break;
      }

      case "CENTER_POINT": {
        // Take moment about start support
        // endMoment + RB*L - P*L/2 - startMoment = 0
        endReaction = (endMoment + (P * L) / 2 + startMoment) / L;
        startReaction = P - endReaction;
        break;
      }

      case "POINT_AT_DISTANCE": {
        if (!beam.pointLoadDistances?.a) break;

        const a = beam.pointLoadDistances.a;
        // Take moment about start support
        // endMoment + RB*L - P*a - startMoment = 0
        endReaction = (endMoment + P * a + startMoment) / L;
        startReaction = P - endReaction;
        break;
      }

      case "NONE": {
        // Only moments affect reactions
        endReaction = (endMoment + startMoment) / L;
        startReaction = -endReaction;
        break;
      }
    }

    // Store reactions with labels RA and RD for first and last column
    reactions[`RA`] = Number(startReaction.toFixed(2));
    reactions[`RD`] = Number(endReaction.toFixed(2));
  });

  return reactions;
};
