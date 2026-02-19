import { Span } from "@/typings";
import { calculateMaxBendingMoment, SpanBMSF } from "./calculateBMSF";
import { LOAD_TYPES } from "./loadTypes";

interface CriticalBMSF {
  location: string;
  position: number;
  bendingMoment: number;
  shearForce: number;
}

export interface SpanCriticalPoints {
  spanLabel: string;
  criticalPoints: CriticalBMSF[];
}

export const extractCriticalBMSF = (
  spans: Span[],
  bmsfResults: SpanBMSF[],
  startReactions: number[],
  startMoments: number[]
): SpanCriticalPoints[] => {
  let cumulativeLength = 0;

  return bmsfResults.map((result, index) => {
    const span = spans[index];
    const startReaction = startReactions[index];
    const startMoment = startMoments[index];
    const { x, bendingMoment, shearForce } = result.results;
    const criticalPoints: CriticalBMSF[] = [];

    // Add start point
    criticalPoints.push({
      location: `Start of span ${result.spanLabel}`,
      position: cumulativeLength,
      bendingMoment: bendingMoment[0],
      shearForce: shearForce[0],
    });

    // Add point loads if any
    switch (span.loadType) {
      case LOAD_TYPES.CENTER_POINT: {
        const midIndex = Math.floor(x.length / 2);
        criticalPoints.push({
          location: `Center point load in span ${result.spanLabel}`,
          position: cumulativeLength + span.length / 2,
          bendingMoment: bendingMoment[midIndex],
          shearForce: shearForce[midIndex],
        });
        break;
      }
      case LOAD_TYPES.POINT_AT_DISTANCE: {
        if (span.pointLoadDistances?.a) {
          const loadIndex = Math.floor(
            (span.pointLoadDistances.a / span.length) * (x.length - 1)
          );
          criticalPoints.push({
            location: `Point load at distance ${span.pointLoadDistances.a}m in span ${result.spanLabel}`,
            position: cumulativeLength + span.pointLoadDistances.a,
            bendingMoment: bendingMoment[loadIndex],
            shearForce: shearForce[loadIndex],
          });
        }
        break;
      }
      case LOAD_TYPES.TWO_POINT_LOADS: {
        const load1Position = span.length / 3;
        const load2Position = (2 * span.length) / 3;

        // Add first load point
        const load1Index = Math.floor(
          (load1Position / span.length) * (x.length - 1)
        );
        criticalPoints.push({
          location: `First point load in span ${result.spanLabel}`,
          position: cumulativeLength + load1Position,
          bendingMoment: bendingMoment[load1Index],
          shearForce: shearForce[load1Index],
        });

        // Add second load point
        const load2Index = Math.floor(
          (load2Position / span.length) * (x.length - 1)
        );
        criticalPoints.push({
          location: `Second point load in span ${result.spanLabel}`,
          position: cumulativeLength + load2Position,
          bendingMoment: bendingMoment[load2Index],
          shearForce: shearForce[load2Index],
        });
        break;
      }
    }

    // Add end point
    criticalPoints.push({
      location: `End of span ${result.spanLabel}`,
      position: cumulativeLength + span.length,
      bendingMoment: bendingMoment[bendingMoment.length - 1],
      shearForce: shearForce[shearForce.length - 1],
    });

    // Add maximum bending moment point if it exists
    const maxBM = calculateMaxBendingMoment(
      span,
      startReaction,
      startMoment,
      span.loadMagnitude,
      span.length
    );

    if (maxBM) {
      const maxIndex = Math.floor(
        (maxBM.position / span.length) * (x.length - 1)
      );
      criticalPoints.push({
        location: `Maximum bending moment in span ${result.spanLabel}`,
        position: cumulativeLength + maxBM.position,
        bendingMoment: maxBM.maxBendingMoment,
        shearForce: 0, // At max BM, shear force is zero
      });
    }

    cumulativeLength += span.length;

    return {
      spanLabel: result.spanLabel,
      criticalPoints,
    };
  });
};
