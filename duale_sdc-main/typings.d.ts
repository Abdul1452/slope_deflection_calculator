export type SupportType = "hinged" | "roller" | "fixed" | "none";
export type LoadType =
  | "none"
  | "center-point"
  | "point-at-distance"
  | "two-point-loads"
  | "three-point-loads"
  | "udl"
  | "vdl-right"
  | "vdl-left";

export interface PointLoad {
  magnitude: number;
  distance: number;
}

export interface PointLoadDistances {
  a?: number; // Distance from left end
  b?: number; // Distance from right end
}

export interface Span {
  length: number;
  momentOfInertia: number;
  loadType: LoadType;
  startSupport: SupportType;
  endSupport: SupportType;
  loadMagnitude: number;
  pointLoadDistances?: PointLoadDistances;
}

export interface CalculatorFormData {
  modulusOfElasticity: number;
  momentOfInertia: number;
  numberOfSpans: number;
  spans: Span[];
  sinkingSupports: number[];
}

export interface FixedEndMomentResults {
  spanLabel: string;
  startMoment: number;
  endMoment: number;
}

export interface SlopeDeflectionEquation {
  spanLabel: string;
  startEquation: string;
  endEquation: string;
}
