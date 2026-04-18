import { Span } from "@/typings";
import { LOAD_TYPES } from "./loadTypes";

/**
 * Fixed-End Moment (FEM) Formulas for Beam Spans
 *
 * A fixed-end moment is the moment that would be induced at the ends of a
 * fully fixed-fixed beam by the applied load.  These are the starting values
 * in the slope-deflection method — they represent the "locked" state before
 * any joint rotation is allowed.
 *
 * Sign convention (clockwise-positive):
 *   FEM_start (at A, left end) is negative for downward loads (hogging).
 *   FEM_end   (at B, right end) is positive for downward loads (sagging).
 */

interface FixedEndMoments {
  start: number;
  end: number;
}

/**
 * Calculate fixed-end moments for a single beam span.
 *
 * @param span - The span object containing load type, magnitude, length, and support info.
 * @returns { start, end } moments in kN·m.  Both are zero for spans without two supports.
 */
export const calculateFixedEndMoments = (span: Span): FixedEndMoments => {
  const { length: L, loadMagnitude: P, startSupport, endSupport } = span;

  // A span with a free (no-support) end is treated as a cantilever or
  // unsupported overhang — standard fixed-end moment formulas do not apply.
  if (startSupport === "none" || endSupport === "none") {
    return {
      start: 0,
      end: 0,
    };
  }

  switch (span.loadType) {
    case LOAD_TYPES.NONE:
      // No load → no fixed-end moments
      return {
        start: 0,
        end: 0,
      };

    case LOAD_TYPES.VDL_RIGHT: {
      // Triangular load increasing to the right (zero at A, maximum w at B).
      // FEM_AB = −wL²/30  (hogging at A)
      // FEM_BA = +wL²/20  (sagging at B)
      const startMoment = (P * Math.pow(L, 2)) / 30;
      const endMoment = (P * Math.pow(L, 2)) / 20;
      return {
        start: -startMoment,
        end: endMoment,
      };
    }

    case LOAD_TYPES.VDL_LEFT: {
      // Triangular load increasing to the left (maximum w at A, zero at B).
      // FEM_AB = −wL²/20  (higher hogging at A because the load is heaviest there)
      // FEM_BA = +wL²/30
      const startMoment = (P * Math.pow(L, 2)) / 30;
      const endMoment = (P * Math.pow(L, 2)) / 20;
      return {
        start: -startMoment,
        end: endMoment,
      };
    }

    case LOAD_TYPES.CENTER_POINT:
      // Single point load P at the midspan (x = L/2).
      // FEM_AB = −PL/8
      // FEM_BA = +PL/8
      const centerMoment = (P * L) / 8;
      return {
        start: -centerMoment,
        end: centerMoment,
      };

    case LOAD_TYPES.POINT_AT_DISTANCE:
      if (!span.pointLoadDistances?.a || !span.pointLoadDistances?.b) {
        return { start: 0, end: 0 };
      }
      // Point load P at distance a from A and b from B (a + b = L).
      // FEM_AB = −Pb²a / L²   (moment at A)
      // FEM_BA = +Pba² / L²   (moment at B)
      const { a, b } = span.pointLoadDistances;
      return {
        start: -(P * Math.pow(b, 2) * a) / Math.pow(L, 2),
        end: (P * b * Math.pow(a, 2)) / Math.pow(L, 2),
      };

    case LOAD_TYPES.TWO_POINT_LOADS:
      // Two equal point loads P at L/3 and 2L/3.
      // FEM_AB = −2PL/9
      // FEM_BA = +2PL/9
      const twoPointMoment = (2 * P * L) / 9;
      return {
        start: -twoPointMoment,
        end: twoPointMoment,
      };

    case LOAD_TYPES.THREE_POINT_LOADS:
      // Three equal point loads P at L/4, L/2, and 3L/4.
      // FEM_AB = −15PL/48
      // FEM_BA = +15PL/48
      const threePointMoment = (15 * P * L) / 48;
      return {
        start: -threePointMoment,
        end: threePointMoment,
      };

    case LOAD_TYPES.UDL:
      // Uniformly distributed load w (kN/m) over the full span length L.
      // FEM_AB = −wL²/12
      // FEM_BA = +wL²/12
      const udlMoment = (P * Math.pow(L, 2)) / 12;
      return {
        start: -udlMoment,
        end: udlMoment,
      };

    default:
      return { start: 0, end: 0 };
  }
};
