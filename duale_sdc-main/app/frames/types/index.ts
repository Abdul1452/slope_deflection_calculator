/**
 * TypeScript types for the frames calculator module.
 *
 * These types define the shape of user inputs (Column, Beam) and the
 * complete result object (CalculationResults) that is passed from the
 * frames page to all three result components.
 */

import {
  FRAME_BEAM_LOAD_TYPES,
  FRAME_FRAME_LOAD_TYPES,
} from "@/app/utils/frameloadTypes";
import { FrameReactions } from "@/app/utils/frameReactions";
import { SimplifiedEquationResult } from "@/app/utils/frameShearEquation";

/** Support condition at the base of a column. */
export type ColumnSupportType = "hinged" | "roller" | "fixed" | "none";

/** Input descriptor for one column of the portal frame. */
export type Column = {
  /** Column height in metres. */
  length: number;
  /** Second moment of area (relative or absolute). */
  momentOfInertia: number;
  /** Support condition at the base. */
  supportType: ColumnSupportType;
  /** Type of lateral load applied to the column (currently NONE or CENTER_POINT). */
  loadType: keyof typeof FRAME_FRAME_LOAD_TYPES;
  /** Magnitude of the applied load in kN. */
  loadMagnitude: number;
};

/** Optional point load placement distances (a from left, b from right). */
interface PointLoadDistances {
  a?: number;
  b?: number;
}

/** Input descriptor for the horizontal beam connecting the two columns. */
export type Beam = {
  /** Beam span length in metres. */
  length: number;
  /** Second moment of area. */
  momentOfInertia: number;
  /** Load magnitude in kN (or kN/m for UDL). */
  loadMagnitude: number;
  /** Type of transverse load on the beam. */
  loadType: keyof typeof FRAME_BEAM_LOAD_TYPES;
  /** Only used when loadType is POINT_AT_DISTANCE. */
  pointLoadDistances?: PointLoadDistances;
};

/** A fixed-end moment result tagged with a human-readable member label. */
export interface FEMWithLabel {
  label: string;   // e.g. "Column 1", "Beam 1"
  start: number;   // FEM at the near (start) end, kN·m
  end: number;     // FEM at the far (end) end, kN·m
}

/** Raw shear equation string (before simplification). */
export interface ShearEquationResult {
  shearEquation: string;
}

/**
 * The complete analysis output for a portal frame.
 * Produced by the frames page's handleSubmit function and consumed by
 * FramesResults, FrameShearForceDiagram, and FrameBendingMomentDiagram.
 */
export interface CalculationResults {
  /** Fixed-end moments for each column. */
  columns: FEMWithLabel[];
  /** Fixed-end moments for each beam. */
  beams: FEMWithLabel[];
  /** Symbolic slope-deflection equations, one per member. */
  slopeDeflectionEquations: {
    memberLabel: string;
    startEquation: string;
    endEquation: string;
  }[];
  /** Joint equilibrium equations (boundary conditions) assembled from the SDE strings. */
  boundaryEquations: {
    eq1: string;   // ΣM at joint B = 0
    eq2: string;   // ΣM at joint C = 0
    eq3?: string;  // M_C2e = 0 (only if Column 2 is hinged/rollered)
  } | null;
  /** Raw and simplified shear equation with extracted coefficients. */
  shearEquation: {
    shearEquation: string;
    simplifiedEquation: SimplifiedEquationResult;
  };
  /** Solved unknowns from the 3×3 or 4×4 simultaneous equation system. */
  solution: {
    thetaB: number;   // EI·θB  (kN·m²)
    thetaC: number;   // EI·θC
    thetaD?: number;  // EI·θD (present only when Column 2 base is non-fixed)
    delta: number;    // EI·δ (sway)
  };
  /** Final member-end moments keyed as "MC1s", "MC1e", "MBCs", "MBCe", "MC2s", "MC2e". */
  finalMoments?: { [key: string]: number };
  /** Horizontal reactions at each column base { H1, H2 }. */
  horizontalReactions: FrameReactions;
  /** Vertical reactions at the beam ends { RA, RD }. */
  verticalReactions: FrameReactions;
  /** BM/SF section data for each column. */
  columnBMSF: Array<{
    sections: Array<{
      sectionLabel: string;
      x: number[];
      bendingMoment: number[];
      shearForce: number[];
    }>;
  }>;
  /** BM/SF data for the beam (21 points for UDL; 3–4 points for point loads). */
  beamBMSF: Array<{
    x: number[];
    bendingMoment: number[];
    shearForce: number[];
  }>;
}
