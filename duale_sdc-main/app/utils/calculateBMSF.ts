import { LOAD_TYPES } from "./loadTypes";
import { calculateSpanReactions } from "./calculateReactions";
import { Span } from "@/typings";

const numberOfPoints = 100;

export interface BMSFResult {
  x: number[];
  bendingMoment: number[];
  shearForce: number[];
}

export interface SpanBMSF {
  spanLabel: string;
  results: BMSFResult;
}

export const calculateBMSF = (
  spans: Span[],
  moments: { [key: string]: number }
) => {
  const startReactions: number[] = [];
  const startMoments: number[] = [];
  const results = spans.map((span, index) => {
    const startNode = String.fromCharCode(65 + index);
    const endNode = String.fromCharCode(66 + index);
    const spanLabel = startNode + endNode;

    // Get moments for current span
    const startMoment = moments[`M${startNode}${endNode}`] || 0;
    const endMoment = moments[`M${endNode}${startNode}`] || 0;

    const results = calculateSpanBMSF(
      span,
      startMoment,
      endMoment,
      numberOfPoints
    );

    const { startReaction, endReaction } = calculateSpanReactions(
      span,
      startMoment,
      endMoment
    );

    startReactions.push(startReaction);
    startMoments.push(startMoment);
    return { spanLabel, results };
  });
  return { results, startReactions, startMoments };
};

const calculateSpanBMSF = (
  span: Span,
  startMoment: number,
  endMoment: number,
  numberOfPoints: number
): BMSFResult => {
  const { length: L, loadMagnitude: P, loadType } = span;
  const dx = L / (numberOfPoints - 1);
  const x: number[] = Array.from({ length: numberOfPoints }, (_, i) => i * dx);
  const bendingMoment: number[] = [];
  const shearForce: number[] = [];

  // Calculate reactions first
  const { startReaction, endReaction } = calculateSpanReactions(
    span,
    startMoment,
    endMoment
  );

  x.forEach((xi) => {
    let M = 0;
    let V = 0;

    // Start with reactions and moments
    M = startMoment + startReaction * xi;
    V = startReaction;

    // Add effects based on load type
    switch (loadType) {
      case LOAD_TYPES.UDL:
        // For UDL, w = P (load per unit length)
        M -= (P * xi * xi) / 2;
        V -= P * xi;
        break;

      case LOAD_TYPES.CENTER_POINT:
        if (xi > L / 2) {
          M -= P * (xi - L / 2);
          V -= P;
        }
        break;

      case LOAD_TYPES.POINT_AT_DISTANCE:
        if (span.pointLoadDistances?.a && xi > span.pointLoadDistances.a) {
          M -= P * (xi - span.pointLoadDistances.a);
          V -= P;
        }
        break;

      case LOAD_TYPES.TWO_POINT_LOADS:
        const x1 = L / 3;
        const x2 = (2 * L) / 3;
        if (xi > x1) {
          M -= P * (xi - x1);
          V -= P;
        }
        if (xi > x2) {
          M -= P * (xi - x2);
          V -= P;
        }
        break;

      case LOAD_TYPES.THREE_POINT_LOADS:
        const pos1 = L / 4;
        const pos2 = L / 2;
        const pos3 = (3 * L) / 4;
        if (xi > pos1) {
          M -= P * (xi - pos1);
          V -= P;
        }
        if (xi > pos2) {
          M -= P * (xi - pos2);
          V -= P;
        }
        if (xi > pos3) {
          M -= P * (xi - pos3);
          V -= P;
        }
        break;

      case LOAD_TYPES.NONE:
        // No changes to M and V
        break;

      case LOAD_TYPES.VDL_RIGHT: {
        // For VDL increasing to right
        const w0 = 0; // Initial intensity
        const w1 = P; // Final intensity
        const w = (w1 - w0) / L; // Rate of increase
        M -= (w * xi * xi * xi) / 6;
        V -= (w * xi * xi) / 2;
        break;
      }

      case LOAD_TYPES.VDL_LEFT: {
        // For VDL increasing to left
        const w1 = P; // Initial intensity
        const w0 = 0; // Final intensity
        const w = (w0 - w1) / L; // Rate of decrease
        M -= (w * xi * xi * xi) / 6 + (w1 * xi * xi) / 2;
        V -= (w * xi * xi) / 2 + w1 * xi;
        break;
      }
    }

    bendingMoment.push(M);
    shearForce.push(V);
  });

  return {
    x,
    bendingMoment,
    shearForce,
  };
};

export const calculateMaxBendingMoment = (
  span: Span,
  startReaction: number,
  startMoment: number,
  P: number,
  L: number
): { position: number; maxBendingMoment: number } | null => {
  // Only calculate if shear force changes sign
  switch (span.loadType) {
    case LOAD_TYPES.UDL:
      {
        // For UDL, V(x) = Ra - wx
        // When V(x) = 0, x = Ra/w
        const x = startReaction / P;
        if (x > 0 && x < L) {
          // M(x) = Ra*x - (w*x^2)/2 + M0
          const maxBM = startReaction * x - (P * x * x) / 2 + startMoment;
          return { position: x, maxBendingMoment: maxBM };
        }
      }
      break;

    case LOAD_TYPES.TWO_POINT_LOADS:
      {
        const x1 = L / 3;
        const x2 = (2 * L) / 3;
        // Check between 0 and first load
        if (startReaction > 0) {
          // M(x) = Ra*x + M0
          const maxBM = startReaction * x1 + startMoment;
          return { position: x1, maxBendingMoment: maxBM };
        }
        // Check between first and second load
        const V1 = startReaction - P;
        if (V1 > 0) {
          // M(x) = Ra*x - P(x-x1) + M0
          const maxBM = startReaction * x2 - P * (x2 - x1) + startMoment;
          return { position: x2, maxBendingMoment: maxBM };
        }
      }
      break;
  }
  return null;
};
