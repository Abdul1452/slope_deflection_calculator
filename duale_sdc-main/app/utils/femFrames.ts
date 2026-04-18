import { ColumnSupportType } from "../frames/types";

/**
 * Fixed-End Moment Formulas for Frame Members
 *
 * Identical mathematical formulas to the beam FEM calculator (calculations.ts),
 * but applied to both columns and the beam of a portal frame.
 *
 * The key difference: columns with a hinged or roller base return zero moments
 * because those support conditions prevent moment development at that end.
 */

interface FrameMember {
  length: number;
  loadMagnitude: number;
  loadType: string;
  supportType?: ColumnSupportType;
  pointLoadDistances?: {
    a?: number;
    b?: number;
  };
}

export interface FixedEndMoments {
  start: number;
  end: number;
}

/**
 * Calculate fixed-end moments for a single frame member (column or beam).
 *
 * @param member - The frame member descriptor including load and support info.
 * @returns { start, end } moments in kN·m.
 */
export const calculateFrameFixedEndMoments = (
  member: FrameMember
): FixedEndMoments => {
  const { length: L, loadMagnitude: P, supportType } = member;

  // Hinged/roller supports cannot develop moments, so FEMs are zero at those ends.
  // The slope-deflection method handles these via boundary conditions instead.
  if (supportType === "hinged" || supportType === "roller") {
    return {
      start: 0,
      end: 0,
    };
  }

  switch (member.loadType) {
    case "UDL": {
      // FEM_start = −wL²/12,  FEM_end = +wL²/12
      const moment = (P * Math.pow(L, 2)) / 12;
      return {
        start: -moment,
        end: moment,
      };
    }

    case "CENTER_POINT": {
      // FEM_start = −PL/8,  FEM_end = +PL/8
      const moment = (P * L) / 8;
      return {
        start: -moment,
        end: moment,
      };
    }

    case "POINT_AT_DISTANCE": {
      // FEM_start = −Pb²a/L²,  FEM_end = +Pba²/L²
      if (!member.pointLoadDistances?.a) {
        console.log("No point load distance provided");
        return { start: 0, end: 0 };
      }

      const a = member.pointLoadDistances.a;
      const b = L - a;
      const L2 = Math.pow(L, 2);

      const start = -(P * Math.pow(b, 2) * a) / L2;
      const end = (P * b * Math.pow(a, 2)) / L2;

      return {
        start: start,
        end: end,
      };
    }

    case "NONE": {
      return { start: 0, end: 0 };
    }

    default: {
      console.log("Unknown load type:", member.loadType);
      return { start: 0, end: 0 };
    }
  }
};
