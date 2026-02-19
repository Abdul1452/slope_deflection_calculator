import { Span } from "@/typings";
import { LOAD_TYPES } from "./loadTypes";

interface FixedEndMoments {
  start: number;
  end: number;
}

export const calculateFixedEndMoments = (span: Span): FixedEndMoments => {
  const { length: L, loadMagnitude: P, startSupport, endSupport } = span;

  if (startSupport === "none" || endSupport === "none") {
    return {
      start: 0,
      end: 0,
    };
  }

  switch (span.loadType) {
    case LOAD_TYPES.NONE:
      return {
        start: 0,
        end: 0,
      };

    case LOAD_TYPES.VDL_RIGHT: {
      // For VDL increasing to right, FEMab = -wL²/20, FEMba = wL²/30
      const startMoment = (P * Math.pow(L, 2)) / 30;
      const endMoment = (P * Math.pow(L, 2)) / 20;
      return {
        start: -startMoment,
        end: endMoment,
      };
    }

    case LOAD_TYPES.VDL_LEFT: {
      // For VDL increasing to left, FEMab = -wL²/30, FEMba = wL²/20
      const startMoment = (P * Math.pow(L, 2)) / 30;
      const endMoment = (P * Math.pow(L, 2)) / 20;
      return {
        start: -startMoment,
        end: endMoment,
      };
    }

    case LOAD_TYPES.CENTER_POINT:
      // FEMab = -PL/8, FEMba = PL/8
      const centerMoment = (P * L) / 8;
      return {
        start: -centerMoment,
        end: centerMoment,
      };

    case LOAD_TYPES.POINT_AT_DISTANCE:
      if (!span.pointLoadDistances?.a || !span.pointLoadDistances?.b) {
        return { start: 0, end: 0 };
      }
      // FEMab = -Pb²a/L², FEMba = Pba²/L²
      const { a, b } = span.pointLoadDistances;
      return {
        start: -(P * Math.pow(b, 2) * a) / Math.pow(L, 2),
        end: (P * b * Math.pow(a, 2)) / Math.pow(L, 2),
      };

    case LOAD_TYPES.TWO_POINT_LOADS:
      // FEMab = -2PL/9, FEMba = 2PL/9
      const twoPointMoment = (2 * P * L) / 9;
      return {
        start: -twoPointMoment,
        end: twoPointMoment,
      };

    case LOAD_TYPES.THREE_POINT_LOADS:
      // FEMab = -15PL/48, FEMba = 15PL/48
      const threePointMoment = (15 * P * L) / 48;
      return {
        start: -threePointMoment,
        end: threePointMoment,
      };

    case LOAD_TYPES.UDL:
      // FEMab = -wL²/12, FEMba = wL²/12
      const udlMoment = (P * Math.pow(L, 2)) / 12;
      return {
        start: -udlMoment,
        end: udlMoment,
      };

    default:
      return { start: 0, end: 0 };
  }
};
