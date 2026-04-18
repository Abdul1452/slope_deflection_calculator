/**
 * Shared TypeScript types for the beams module.
 *
 * These types model the structural input data and the intermediate/final
 * calculation results passed between the beams page and the utility functions.
 */

/** The type of support at a beam node. "none" means no restraint (free end). */
export type SupportType = "hinged" | "roller" | "fixed" | "none";
/**
 * The types of transverse load that can be applied to a beam span.
 * Each value maps to a specific set of fixed-end moment formulas.
 */
export type LoadType =
  | "none"
  | "center-point"
  | "point-at-distance"
  | "two-point-loads"
  | "three-point-loads"
  | "udl"
  | "vdl-right"
  | "vdl-left";

/** Optional distances for a point load positioned at a specific location within a span. */
export interface PointLoad {
  magnitude: number;
  distance: number;
}

export interface PointLoadDistances {
  a?: number; // Distance from left end
  b?: number; // Distance from right end
}

/** Represents a single span in a continuous beam. */
export interface Span {
  length: number;
  momentOfInertia: number;
  loadType: LoadType;
  startSupport: SupportType;
  endSupport: SupportType;
  loadMagnitude: number;
  pointLoadDistances?: PointLoadDistances;
}

/** Top-level form data for the beams calculator. */
export interface CalculatorFormData {
  modulusOfElasticity: number;
  momentOfInertia: number;
  numberOfSpans: number;
  spans: Span[];
  sinkingSupports: number[];
}

/** Fixed-end moment result for one span, used in the first step of the analysis. */
export interface FixedEndMomentResults {
  spanLabel: string;
  startMoment: number;
  endMoment: number;
}

/**
 * A symbolic slope-deflection equation for one span, stored as strings.
 * Example startEquation: "10.00 + 1.33EIθB + 0.67EIθC - 0.0050EI"
 * These strings are later parsed by the solver and the final-moment calculator.
 */
export interface SlopeDeflectionEquation {
  spanLabel: string;
  startEquation: string;
  endEquation: string;
}
