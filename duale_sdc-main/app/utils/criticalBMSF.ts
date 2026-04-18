import { Span } from "@/typings";
import { calculateMaxBendingMoment, SpanBMSF } from "./calculateBMSF";
import { LOAD_TYPES } from "./loadTypes";

/**
 * Critical BMSF Point Extractor (Beams)
 *
 * The continuous 100-point BM/SF arrays are useful for rendering smooth diagram
 * curves, but the results table needs only the *structurally significant* points:
 *
 *   - Support positions (start and end of each span)
 *   - Load application positions (point loads, distributed load boundaries)
 *   - Zero-shear position (maximum bending moment for certain load types)
 *
 * This module picks those points and labels them for display.
 */

interface CriticalBMSF {
  location: string;
  position: number;     // Cumulative position along the full beam (m)
  bendingMoment: number;
  shearForce: number;
}

export interface SpanCriticalPoints {
  spanLabel: string;
  criticalPoints: CriticalBMSF[];
}

/**
 * Extract the structurally critical BM/SF points from the continuous diagram data.
 *
 * Positions are reported as cumulative distances from the start of the first span
 * so they map correctly onto the combined-span chart X-axis.
 *
 * @param spans           All beam spans.
 * @param bmsfResults     100-point BM/SF arrays per span (from calculateBMSF).
 * @param startReactions  Start (left) support reactions per span.
 * @param startMoments    Start (left) member-end moments per span.
 * @returns               One SpanCriticalPoints object per span.
 */
export const extractCriticalBMSF = (
  spans: Span[],
  bmsfResults: SpanBMSF[],
  startReactions: number[],
  startMoments: number[]
): SpanCriticalPoints[] => {
  // Tracks the running sum of span lengths so each point is positioned globally
  let cumulativeLength = 0;

  return bmsfResults.map((result, index) => {
    const span = spans[index];
    const startReaction = startReactions[index];
    const startMoment = startMoments[index];
    const { x, bendingMoment, shearForce } = result.results;
    const criticalPoints: CriticalBMSF[] = [];

    // -----------------------------------------------------------------------
    // 1. Start-of-span (support position)
    // -----------------------------------------------------------------------
    criticalPoints.push({
      location: `Start of span ${result.spanLabel}`,
      position: cumulativeLength,
      bendingMoment: bendingMoment[0],
      shearForce: shearForce[0],
    });

    // -----------------------------------------------------------------------
    // 2. Load application positions
    // -----------------------------------------------------------------------
    switch (span.loadType) {
      case LOAD_TYPES.CENTER_POINT: {
        // Single load at midspan
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
        // Load at distance a from start
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
        // Loads at L/3 and 2L/3
        const load1Position = span.length / 3;
        const load2Position = (2 * span.length) / 3;

        const load1Index = Math.floor(
          (load1Position / span.length) * (x.length - 1)
        );
        criticalPoints.push({
          location: `First point load in span ${result.spanLabel}`,
          position: cumulativeLength + load1Position,
          bendingMoment: bendingMoment[load1Index],
          shearForce: shearForce[load1Index],
        });

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

    // -----------------------------------------------------------------------
    // 3. End-of-span (right support position)
    // -----------------------------------------------------------------------
    criticalPoints.push({
      location: `End of span ${result.spanLabel}`,
      position: cumulativeLength + span.length,
      bendingMoment: bendingMoment[bendingMoment.length - 1],
      shearForce: shearForce[shearForce.length - 1],
    });

    // -----------------------------------------------------------------------
    // 4. Maximum bending moment position (zero-shear point)
    //    Applicable to UDL and two-point-load spans.
    // -----------------------------------------------------------------------
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
        shearForce: 0, // By definition, V = 0 at the maximum BM location
      });
    }

    cumulativeLength += span.length;

    return {
      spanLabel: result.spanLabel,
      criticalPoints,
    };
  });
};
