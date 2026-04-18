import { FrameFinalMoments } from "./framesFinalMoments";
import { FrameReactions } from "./frameReactions";
import { Beam, Column } from "../frames/types";

/**
 * Frame Bending Moment and Shear Force Diagram Data
 *
 * Computes BM and SF values at key section positions for frame members so the
 * SVG diagram components (frame-bm-diagram.tsx and frame-sf-diagram.tsx)
 * can render the diagrams.
 *
 * Unlike the beam BMSF calculator which generates 100 continuous points,
 * frame members only need BM/SF at a small number of structurally significant
 * positions (end points + load application points), because the diagrams are
 * rendered as straight lines or simple parabolas in SVG.
 *
 * **Column sign convention**: The horizontal reaction H at the column base acts
 * as the "shear" force in the column.  BM is measured from the base upward:
 *   V(x) = −H                 (constant, no load)
 *   M(x) = M_base − H × x    (linear from base moment)
 *
 * For a centre horizontal point load:
 *   V(x) = −H                 before the load
 *   V(x) = −H − P             after the load
 *
 * **Beam sign convention**: Identical to the beam calculator.
 *   V(x) = R_A  (+ load corrections)
 *   M(x) = M_start + R_A × x  (+ load corrections)
 */

interface ColumnSection {
  sectionLabel: string;
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

interface ColumnBMSF {
  sections: ColumnSection[];
}

interface BeamBMSF {
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

/**
 * Compute BM and SF at key section points along a column.
 *
 * @param column              Column descriptor.
 * @param columnIndex         0-based column index (0 = C1, 1 = C2).
 * @param finalMoments        Final member-end moments dictionary.
 * @param horizontalReactions Horizontal reactions at column bases.
 * @returns                   ColumnBMSF with one or two sections.
 */
export const calculateColumnBMSF = (
  column: Column,
  columnIndex: number,
  finalMoments: FrameFinalMoments,
  horizontalReactions: FrameReactions
): ColumnBMSF => {
  const { length: columnHeight } = column;
  const sections: ColumnSection[] = [];

  const columnLabel = `C${columnIndex + 1}`;
  // H is positive in the assumed direction; negate it for the shear-from-base calc
  const horizontalReaction = horizontalReactions[`H${columnIndex + 1}`] || 0;
  // M_start = moment at the base (bottom) of the column
  const startMoment = finalMoments[`M${columnLabel}s`] || 0;

  if (column.loadType === "CENTER_POINT") {
    // A horizontal point load at mid-height splits the column into two sections
    const centerPoint = columnHeight / 2;

    // Section 1: from base (x=0) to load position (x=h/2)
    const section1: ColumnSection = {
      sectionLabel: "Before Load",
      x: [0, centerPoint],
      bendingMoment: [],
      shearForce: [],
    };

    section1.x.forEach((xi) => {
      // Shear force = −H (horizontal reaction at base, acting as column shear)
      const Fx = -horizontalReaction;
      // BM = M_base + (−H) × x  (linear function of height)
      const Mx = startMoment + -horizontalReaction * xi;
      section1.shearForce.push(Number(Fx.toFixed(2)));
      section1.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section1);

    // Section 2: from load position (x=h/2) to top (x=h)
    const section2: ColumnSection = {
      sectionLabel: "After Load",
      x: [centerPoint, columnHeight],
      bendingMoment: [],
      shearForce: [],
    };

    section2.x.forEach((xi) => {
      // Shear force = −H − P  (the horizontal load P is now in the section)
      const Fx = -horizontalReaction - column.loadMagnitude;
      // BM = M_base + (−H) × x − P × (x − h/2)
      const Mx =
        startMoment +
        -horizontalReaction * xi -
        column.loadMagnitude * (xi - centerPoint);
      section2.shearForce.push(Number(Fx.toFixed(2)));
      section2.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section2);
  } else if (column.loadType === "NONE") {
    // No applied load — single section from base to top
    const section: ColumnSection = {
      sectionLabel: "Full Column",
      x: [0, columnHeight],
      bendingMoment: [],
      shearForce: [],
    };

    section.x.forEach((xi) => {
      const Fx = -horizontalReaction;
      const Mx = startMoment + -horizontalReaction * xi;
      section.shearForce.push(Number(Fx.toFixed(2)));
      section.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section);
  }

  return { sections };
};

/**
 * Compute BM and SF along the beam at structurally significant x positions.
 *
 * For UDL: 21 evenly-spaced points are generated to render a smooth parabola.
 * For point loads: only the critical positions (0, load point, L) are used,
 *   plus the zero-shear point if it falls within the span.
 *
 * @param beam             Beam descriptor.
 * @param startMoment      Moment at the left (B) end of the beam, kN·m.
 * @param verticalReactions Vertical reactions { RA, RD }.
 * @returns                BeamBMSF with x, bendingMoment, shearForce arrays.
 */
export const calculateBeamBMSF = (
  beam: Beam,
  startMoment: number,
  verticalReactions: FrameReactions
): BeamBMSF => {
  const { length: beamLength, loadMagnitude, pointLoadDistances } = beam;
  const x: number[] = [];
  const bendingMoment: number[] = [];
  const shearForce: number[] = [];

  const startReaction = verticalReactions.RA || 0;

  if (beam.loadType === "UDL") {
    // 21 evenly-spaced points (indices 0–20) produce a smooth parabolic BMD
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const xi = (i / numPoints) * beamLength;
      x.push(Number(xi.toFixed(2)));

      // V(x) = R_A − w·x
      const Fx = startReaction - loadMagnitude * xi;
      shearForce.push(Number(Fx.toFixed(2)));

      // M(x) = R_A·x + M_start − w·x²/2
      const Mx =
        startReaction * xi + startMoment - loadMagnitude * xi * (xi / 2);
      bendingMoment.push(Number(Mx.toFixed(2)));
    }
  } else if (beam.loadType === "POINT_AT_DISTANCE") {
    const a = pointLoadDistances?.a || 0;

    // Key positions: left end, load point, right end
    const points = [0, a, beamLength];
    points.forEach((xi) => {
      x.push(Number(xi.toFixed(2)));

      // V: constant RA before load, RA−P after load
      const Fx = xi < a ? startReaction : startReaction - loadMagnitude;
      shearForce.push(Number(Fx.toFixed(2)));

      // M: linear before load, continues linearly after with reduced slope
      const Mx =
        xi < a
          ? startReaction * xi + startMoment
          : startReaction * xi + startMoment - loadMagnitude * (xi - a);
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Insert the zero-shear (maximum BM) point if it falls within the span
    const maxBMPosition = startReaction / loadMagnitude;
    if (maxBMPosition > 0 && maxBMPosition < beamLength) {
      x.push(Number(maxBMPosition.toFixed(2)));
      shearForce.push(0);
      const maxBM =
        startReaction * maxBMPosition +
        startMoment -
        loadMagnitude * (maxBMPosition - a);
      bendingMoment.push(Number(maxBM.toFixed(2)));

      // Re-sort all arrays by x position after inserting the extra point
      const sortedIndices = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
      x.sort((a, b) => a - b);
      const sortedBM = sortedIndices.map((i) => bendingMoment[i]);
      const sortedSF = sortedIndices.map((i) => shearForce[i]);
      bendingMoment.splice(0, bendingMoment.length, ...sortedBM);
      shearForce.splice(0, shearForce.length, ...sortedSF);
    }
  } else if (beam.loadType === "CENTER_POINT") {
    const centerPoint = beamLength / 2;

    // Section 1: left end → load point (constant shear = R_A)
    const section1Points = [0, centerPoint];
    section1Points.forEach((xi) => {
      x.push(Number(xi.toFixed(2)));
      shearForce.push(Number(startReaction.toFixed(2)));
      const Mx = startReaction * xi + startMoment;
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Section 2: load point → right end (constant shear = R_A − P)
    const section2Points = [centerPoint, beamLength];
    section2Points.forEach((xi) => {
      // Skip the centre point — already added in section 1
      if (xi !== centerPoint) {
        x.push(Number(xi.toFixed(2)));
      }

      const Fx = startReaction - loadMagnitude;
      shearForce.push(Number(Fx.toFixed(2)));

      const Mx =
        startReaction * xi + startMoment - loadMagnitude * (xi - centerPoint);
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Sort all arrays by ascending x (section 2 reuses the centre-point SF/BM)
    const sortedIndices = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
    x.sort((a, b) => a - b);
    const sortedBM = sortedIndices.map((i) => bendingMoment[i]);
    const sortedSF = sortedIndices.map((i) => shearForce[i]);
    bendingMoment.splice(0, bendingMoment.length, ...sortedBM);
    shearForce.splice(0, shearForce.length, ...sortedSF);
  }

  return {
    x,
    bendingMoment,
    shearForce,
  };
};

interface ColumnSection {
  sectionLabel: string;
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

interface ColumnBMSF {
  sections: ColumnSection[];
}

interface BeamBMSF {
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

export const calculateColumnBMSF = (
  column: Column,
  columnIndex: number,
  finalMoments: FrameFinalMoments,
  horizontalReactions: FrameReactions
): ColumnBMSF => {
  const { length: columnHeight } = column;
  const sections: ColumnSection[] = [];

  // Get column label (C1 or C2)
  const columnLabel = `C${columnIndex + 1}`;
  const horizontalReaction = horizontalReactions[`H${columnIndex + 1}`] || 0;
  const startMoment = finalMoments[`M${columnLabel}s`] || 0;

  if (column.loadType === "CENTER_POINT") {
    const centerPoint = columnHeight / 2;

    // Section 1: Before point load
    const section1: ColumnSection = {
      sectionLabel: "Before Load",
      x: [0, centerPoint],
      bendingMoment: [],
      shearForce: [],
    };

    section1.x.forEach((xi) => {
      const Fx = -horizontalReaction;
      const Mx = startMoment + -horizontalReaction * xi;
      section1.shearForce.push(Number(Fx.toFixed(2)));
      section1.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section1);

    // Section 2: After point load
    const section2: ColumnSection = {
      sectionLabel: "After Load",
      x: [centerPoint, columnHeight],
      bendingMoment: [],
      shearForce: [],
    };

    section2.x.forEach((xi) => {
      const Fx = -horizontalReaction - column.loadMagnitude;
      const Mx =
        startMoment +
        -horizontalReaction * xi -
        column.loadMagnitude * (xi - centerPoint);
      section2.shearForce.push(Number(Fx.toFixed(2)));
      section2.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section2);
  } else if (column.loadType === "NONE") {
    // For no load, create a single section
    const section: ColumnSection = {
      sectionLabel: "Full Column",
      x: [0, columnHeight],
      bendingMoment: [],
      shearForce: [],
    };

    section.x.forEach((xi) => {
      const Fx = -horizontalReaction;
      const Mx = startMoment + -horizontalReaction * xi;
      section.shearForce.push(Number(Fx.toFixed(2)));
      section.bendingMoment.push(Number(Mx.toFixed(2)));
    });
    sections.push(section);
  }

  return { sections };
};

export const calculateBeamBMSF = (
  beam: Beam,
  startMoment: number,
  verticalReactions: FrameReactions
): BeamBMSF => {
  const { length: beamLength, loadMagnitude, pointLoadDistances } = beam;
  const x: number[] = [];
  const bendingMoment: number[] = [];
  const shearForce: number[] = [];

  const startReaction = verticalReactions.RA || 0;

  if (beam.loadType === "UDL") {
    // Create more points to form a smooth parabola
    const numPoints = 20; // Increased number of points for smoother curve
    for (let i = 0; i <= numPoints; i++) {
      const xi = (i / numPoints) * beamLength;
      x.push(Number(xi.toFixed(2)));

      // Calculate shear force: Fx = RA - w*x
      const Fx = startReaction - loadMagnitude * xi;
      shearForce.push(Number(Fx.toFixed(2)));

      // Calculate bending moment: Mx = RA*x + startMoment - w*x*(x/2)
      const Mx =
        startReaction * xi + startMoment - loadMagnitude * xi * (xi / 2);
      bendingMoment.push(Number(Mx.toFixed(2)));
    }
  } else if (beam.loadType === "POINT_AT_DISTANCE") {
    const a = pointLoadDistances?.a || 0; // Distance from left end
    const b = pointLoadDistances?.b || 0; // Distance from right end

    // Calculate positions
    const points = [0, a, beamLength]; // Start, point load, end
    points.forEach((xi) => {
      x.push(Number(xi.toFixed(2)));

      // Calculate shear force
      const Fx = xi < a ? startReaction : startReaction - loadMagnitude;
      shearForce.push(Number(Fx.toFixed(2)));

      // Calculate bending moment
      const Mx =
        xi < a
          ? startReaction * xi + startMoment
          : startReaction * xi + startMoment - loadMagnitude * (xi - a);
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Add maximum bending moment point if it exists
    const maxBMPosition = startReaction / loadMagnitude;
    if (maxBMPosition > 0 && maxBMPosition < beamLength) {
      x.push(Number(maxBMPosition.toFixed(2)));
      shearForce.push(0);
      const maxBM =
        startReaction * maxBMPosition +
        startMoment -
        loadMagnitude * (maxBMPosition - a);
      bendingMoment.push(Number(maxBM.toFixed(2)));

      // Sort arrays based on x positions
      const sortedIndices = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
      x.sort((a, b) => a - b);
      const sortedBM = sortedIndices.map((i) => bendingMoment[i]);
      const sortedSF = sortedIndices.map((i) => shearForce[i]);
      bendingMoment.splice(0, bendingMoment.length, ...sortedBM);
      shearForce.splice(0, shearForce.length, ...sortedSF);
    }
  } else if (beam.loadType === "CENTER_POINT") {
    const centerPoint = beamLength / 2;

    // Section 1: Before the center point load
    const section1Points = [0, centerPoint];
    section1Points.forEach((xi) => {
      x.push(Number(xi.toFixed(2)));

      // Calculate shear force before load
      const Fx = startReaction;
      shearForce.push(Number(Fx.toFixed(2)));

      // Calculate bending moment before load
      const Mx = startReaction * xi + startMoment;
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Section 2: After the center point load
    const section2Points = [centerPoint, beamLength];
    section2Points.forEach((xi) => {
      // Don't add centerPoint again as it's already added
      if (xi !== centerPoint) {
        x.push(Number(xi.toFixed(2)));
      }

      // Calculate shear force after load
      const Fx = startReaction - loadMagnitude;
      shearForce.push(Number(Fx.toFixed(2)));

      // Calculate bending moment after load
      const Mx =
        startReaction * xi + startMoment - loadMagnitude * (xi - centerPoint);
      bendingMoment.push(Number(Mx.toFixed(2)));
    });

    // Ensure points are sorted by x position
    const sortedIndices = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
    x.sort((a, b) => a - b);
    const sortedBM = sortedIndices.map((i) => bendingMoment[i]);
    const sortedSF = sortedIndices.map((i) => shearForce[i]);
    bendingMoment.splice(0, bendingMoment.length, ...sortedBM);
    shearForce.splice(0, shearForce.length, ...sortedSF);
  }

  return {
    x,
    bendingMoment,
    shearForce,
  };
};
