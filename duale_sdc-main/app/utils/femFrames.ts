import { ColumnSupportType } from "../frames/types";

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

export const calculateFrameFixedEndMoments = (
  member: FrameMember
): FixedEndMoments => {
  const { length: L, loadMagnitude: P, supportType } = member;

  // Return zero moments if support type is hinged or roller
  if (supportType === "hinged" || supportType === "roller") {
    return {
      start: 0,
      end: 0,
    };
  }

  switch (member.loadType) {
    case "UDL": {
      // Changed from FRAME_BEAM_LOAD_TYPES.UDL
      // FEMab = -wL²/12, FEMba = wL²/12
      const moment = (P * Math.pow(L, 2)) / 12;
      return {
        start: -moment,
        end: moment,
      };
    }

    case "CENTER_POINT": {
      // Changed from FRAME_BEAM_LOAD_TYPES.CENTER_POINT
      // FEMab = -PL/8, FEMba = PL/8
      const moment = (P * L) / 8;
      return {
        start: -moment,
        end: moment,
      };
    }

    case "POINT_AT_DISTANCE": {
      // Changed from FRAME_BEAM_LOAD_TYPES.POINT_AT_DISTANCE
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
