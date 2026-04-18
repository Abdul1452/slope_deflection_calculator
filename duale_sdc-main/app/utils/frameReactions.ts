import { Column, Beam } from "../frames/types";
import { FrameFinalMoments } from "./framesFinalMoments";

/**
 * Frame Reaction Calculator
 *
 * After the final member-end moments are known, support reactions are calculated
 * by applying moment and force equilibrium to each member.
 *
 * **Horizontal reactions** (column bases):
 *   ΣM_base = 0:  H × h + M_top + M_base ± P × h/2 = 0
 *   → H = (M_top + M_base ± P × h/2) / h
 *   (P is a horizontal point load on the column, if any)
 *
 * **Vertical reactions** (beam ends):
 *   ΣM_left = 0:  R_right × L − load_moment − M_right + M_left = 0
 *   → R_right = (M_left + M_right + load_moment) / L
 *   → R_left  = total_load − R_right
 */

export interface FrameReactions {
  [key: string]: number;
}

/**
 * Compute horizontal reactions at the base of each column.
 *
 * @param columns      Array of column descriptors.
 * @param finalMoments Dictionary of member-end moments (e.g. MC1s, MC1e, …).
 * @returns            { H1, H2 } horizontal reactions in kN (positive = assumed direction).
 */
export const calculateFrameHorizontalReactions = (
  columns: Column[],
  finalMoments: FrameFinalMoments
): FrameReactions => {
  const reactions: FrameReactions = {};

  columns.forEach((column, index) => {
    const columnLabel = `C${index + 1}`;
    // MC1s = base moment, MC1e = top moment (start/end convention from SDE)
    const startMoment = finalMoments[`M${columnLabel}s`] || 0;
    const endMoment = finalMoments[`M${columnLabel}e`] || 0;
    const height = column.length;

    let horizontalReaction = 0;

    if (column.loadType === "CENTER_POINT") {
      // Centre horizontal point load: extra moment P × h/2 about the base
      // H = (M_base + M_top − P × h/2) / h
      horizontalReaction =
        (startMoment + endMoment - (column.loadMagnitude * height) / 2) /
        height;
    } else {
      // No horizontal load: H = (M_base + M_top) / h
      horizontalReaction = (startMoment + endMoment) / height;
    }

    reactions[`H${index + 1}`] = Number(horizontalReaction.toFixed(2));
  });

  return reactions;
};

/**
 * Compute vertical reactions at the ends of each frame beam.
 *
 * @param beams        Array of beam descriptors.
 * @param finalMoments Dictionary of member-end moments.
 * @returns            { RA, RD } — vertical reactions at the left (B) and right (C) beam ends.
 */
export const calculateFrameVerticalReactions = (
  beams: Beam[],
  finalMoments: FrameFinalMoments
): FrameReactions => {
  const reactions: FrameReactions = {};

  beams.forEach((beam, index) => {
    const { length: L, loadMagnitude: P, loadType } = beam;

    // Beam moments: MBCs = left end (B), MBCe = right end (C)
    const startMoment = finalMoments[`MBCs`] || 0;
    const endMoment = finalMoments[`MBCe`] || 0;

    let startReaction = 0;
    let endReaction = 0;

    switch (loadType) {
      case "UDL": {
        // Total load = w × L
        const totalLoad = P * L;
        // ΣM_left = 0:  R_right × L − wL²/2 − M_right + M_left = 0
        endReaction = (endMoment + (P * L * L) / 2 + startMoment) / L;
        // ΣV = 0: R_left = wL − R_right
        startReaction = totalLoad - endReaction;
        break;
      }

      case "CENTER_POINT": {
        // ΣM_left = 0:  R_right × L − P × L/2 − M_right + M_left = 0
        endReaction = (endMoment + (P * L) / 2 + startMoment) / L;
        startReaction = P - endReaction;
        break;
      }

      case "POINT_AT_DISTANCE": {
        if (!beam.pointLoadDistances?.a) break;
        const a = beam.pointLoadDistances.a;
        // ΣM_left = 0:  R_right × L − P × a − M_right + M_left = 0
        endReaction = (endMoment + P * a + startMoment) / L;
        startReaction = P - endReaction;
        break;
      }

      case "NONE": {
        // No applied load — only end moments contribute
        endReaction = (endMoment + startMoment) / L;
        startReaction = -endReaction;
        break;
      }
    }

    // RA = reaction at left (B) end of beam, RD = reaction at right (C/D) end
    reactions[`RA`] = Number(startReaction.toFixed(2));
    reactions[`RD`] = Number(endReaction.toFixed(2));
  });

  return reactions;
};

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
