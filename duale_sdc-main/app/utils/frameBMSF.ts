import { FrameFinalMoments } from "./framesFinalMoments";
import { FrameReactions } from "./frameReactions";
import { Beam, Column } from "../frames/types";

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
