/**
 * Frames Calculator Page — app/frames/page.tsx
 *
 * Orchestration component for the portal frame analysis workflow.
 *
 * SUPPORTED FRAME TOPOLOGY:
 *   Two columns (C1, C2) connected at the top by one beam (BC).
 *   The solver supports fixed, hinged, or roller bases on either column.
 *
 * CALCULATION PIPELINE (handleSubmit):
 *   Step 1.  calculateFrameFixedEndMoments(member)   per column + beam → FEM results
 *   Step 2.  generateFrameSlopeDeflectionEquations(…)                  → SDE strings
 *   Step 3.  generalFrameEquation(equations, hasHingeOrRoller)         → boundary equations
 *   Step 4.  generateFrameShearEquation(columns, equations)            → shear equation
 *   Step 5.  simplifyFrameShearEquation(shearEq)                       → simplified + coefficients
 *   Step 6.  solveFrameEquations(eq1, eq2, eq3, shearEq)               → θB, θC, θD, δ
 *   Step 7.  calculateFrameFinalMoments(equations, columns, θ…, δ, EI=1) → final moments
 *   Step 8.  calculateFrameHorizontalReactions(columns, moments)       → H1, H2
 *   Step 9.  calculateFrameVerticalReactions(beams, moments)           → RA, RD
 *   Step 10. calculateColumnBMSF(column, index, moments, hReactions)   per column
 *   Step 11. calculateBeamBMSF(beam, startMoment, vReactions)          per beam
 *
 * Note on EI: The solver returns EI·θ values, not plain θ, so calculateFrameFinalMoments
 * is called with EI=1 to avoid double-multiplying.
 *
 * This is a Client Component because it uses React useState hooks.
 */
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FramesResults from "../components/fr-results";
import { Beam, CalculationResults, Column } from "../frames/types";
import { calculateFrameFixedEndMoments } from "../utils/femFrames";
import { generalFrameEquation } from "../utils/frameBoundaryCondition";
import { generateFrameSlopeDeflectionEquations } from "../utils/frameSlopeDeflection";

import { Input } from "@/components/ui/input";

import { calculateBeamBMSF, calculateColumnBMSF } from "../utils/frameBMSF";
import {
  calculateFrameHorizontalReactions,
  calculateFrameVerticalReactions,
} from "../utils/frameReactions";
import {
  generateFrameShearEquation,
  simplifyFrameShearEquation,
  solveFrameEquations,
} from "../utils/frameShearEquation";
import { calculateFrameFinalMoments } from "../utils/framesFinalMoments";
import ColumnForm from "../components/frame-forms/column-form";
import BeamForm from "../components/frame-forms/beam-form";
import FrameShearForceDiagram from "../components/frame-sf-diagram";
import FrameBendingMomentDiagram from "../components/frame-bm-diagram";

const initialColumn: Column = {
  length: 0,
  momentOfInertia: 0,
  supportType: "fixed",
  loadType: "NONE",
  loadMagnitude: 0,
};

const initialBeam: Beam = {
  length: 0,
  momentOfInertia: 0,
  loadMagnitude: 0,
  loadType: "NONE",
};

export default function FramesPage() {
  const [formData, setFormData] = useState({
    numberOfColumns: 0,
    numberOfBeams: 0,
    columns: [] as Column[],
    beams: [] as Beam[],
  });

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const handleNumberOfColumnsChange = (value: number) => {
    const newColumns = Array(value)
      .fill(null)
      .map(() => ({ ...initialColumn }));
    setFormData((prev) => ({
      ...prev,
      numberOfColumns: value,
      columns: newColumns,
    }));
  };

  const handleNumberOfBeamsChange = (value: number) => {
    const newBeams = Array(value)
      .fill(null)
      .map(() => ({ ...initialBeam }));
    setFormData((prev) => ({
      ...prev,
      numberOfBeams: value,
      beams: newBeams,
    }));
  };

  const handleColumnChange = (
    index: number,
    field: keyof Column,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      ),
    }));
  };

  const handleBeamChange = (index: number, field: keyof Beam, value: any) => {
    setFormData((prev) => ({
      ...prev,
      beams: prev.beams.map((beam, i) =>
        i === index ? { ...beam, [field]: value } : beam
      ),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCalculationError(null);

    try {
      // -------------------------------------------------------------------
      // Step 1: Fixed-end moments for each column and beam
      // -------------------------------------------------------------------
      const columnResults = formData.columns.map((column, index) => ({
        label: `Column ${index + 1}`,
        ...calculateFrameFixedEndMoments(column),
      }));

      const beamResults = formData.beams.map((beam, index) => ({
        label: `Beam ${index + 1}`,
        ...calculateFrameFixedEndMoments(beam),
      }));

      // -------------------------------------------------------------------
      // Step 2: Slope-deflection equations for all members
      // Columns include the sway (EIδ) term; beams do not.
      // -------------------------------------------------------------------
      const slopeDeflectionEquations = generateFrameSlopeDeflectionEquations(
        formData.columns,
        formData.beams,
        [...columnResults, ...beamResults]
      );

      // Determine whether any column has a non-fixed base (hinged/roller).
      // This controls whether a third boundary equation is needed for θD.
      const hasHingeOrRoller = formData.columns.some(
        (column) =>
          column.supportType === "hinged" || column.supportType === "roller"
      );

      // -------------------------------------------------------------------
      // Step 3: Joint equilibrium boundary equations (ΣM = 0 at B and C)
      // -------------------------------------------------------------------
      const boundaryEquations = generalFrameEquation(
        slopeDeflectionEquations,
        hasHingeOrRoller
      );

      // -------------------------------------------------------------------
      // Step 4 & 5: Shear equation (horizontal equilibrium) and simplification
      // -------------------------------------------------------------------
      const shearEquation = generateFrameShearEquation(
        formData.columns,
        slopeDeflectionEquations
      );

      const simplifiedShearEquation = simplifyFrameShearEquation(
        shearEquation.shearEquation
      );

      // -------------------------------------------------------------------
      // Step 6: Solve the 3×3 or 4×4 system by Gaussian elimination
      // -------------------------------------------------------------------
      const solution = solveFrameEquations(
        boundaryEquations?.eq1 || "",
        boundaryEquations?.eq2 || "",
        boundaryEquations?.eq3 || null,
        simplifiedShearEquation.simplifiedEquation
      );

      // -------------------------------------------------------------------
      // Step 7: Final moments — substitute θ and δ into each SDE
      // EI = 1 because the solver returns EI·θ values, not plain θ.
      // -------------------------------------------------------------------
      const finalMoments = calculateFrameFinalMoments(
        slopeDeflectionEquations,
        formData.columns,
        solution.thetaB,
        solution.thetaC,
        solution.thetaD,
        solution.delta,
        1
      );

      // -------------------------------------------------------------------
      // Step 8 & 9: Support reactions (horizontal and vertical)
      // -------------------------------------------------------------------
      const horizontalReactions = calculateFrameHorizontalReactions(
        formData.columns,
        finalMoments
      );

      const verticalReactions = calculateFrameVerticalReactions(
        formData.beams,
        finalMoments
      );

      // -------------------------------------------------------------------
      // Step 10 & 11: BM/SF data for SVG diagram components
      // -------------------------------------------------------------------
      const columnBMSF = formData.columns.map((column, index) =>
        calculateColumnBMSF(column, index, finalMoments, horizontalReactions)
      );

      const beamBMSF = formData.beams.map((beam) =>
        calculateBeamBMSF(
          beam,
          finalMoments[`MBCs`] || 0, // Start (B-end) moment of the beam
          verticalReactions
        )
      );

      setResults({
        columns: columnResults,
        beams: beamResults,
        slopeDeflectionEquations,
        boundaryEquations,
        shearEquation: {
          ...shearEquation,
          simplifiedEquation: simplifiedShearEquation,
        },
        solution,
        finalMoments,
        horizontalReactions,
        verticalReactions,
        columnBMSF,
        beamBMSF,
      });
    } catch (err: any) {
      setCalculationError(
        err?.message ||
          "An error occurred during calculation. Please check your inputs."
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Patterns */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#e5e7eb,transparent)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/30 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto py-8 max-w-4xl px-4 relative z-10">
        <h1 className="text-xl md:text-3xl font-bold mb-8 text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          Frame Analysis
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200">
                Number of Columns
              </Label>
              <Input
                type="number"
                value={formData.numberOfColumns}
                onChange={(e) =>
                  handleNumberOfColumnsChange(parseInt(e.target.value) || 0)
                }
                min={0}
                className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200">
                Number of Beams
              </Label>
              <Input
                type="number"
                value={formData.numberOfBeams}
                onChange={(e) =>
                  handleNumberOfBeamsChange(parseInt(e.target.value) || 0)
                }
                min={0}
                className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>
          </div>

          {formData.columns.length > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm">
              <ColumnForm
                columns={formData.columns}
                onColumnChange={handleColumnChange}
              />
            </div>
          )}

          {formData.beams.length > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm">
              <BeamForm
                beams={formData.beams}
                onBeamChange={handleBeamChange}
              />
            </div>
          )}

          <Button
            disabled={
              formData.numberOfColumns === 0 && formData.numberOfBeams === 0
            }
            className="w-full hover:bg-indigo-300 duration-300"
          >
            SUBMIT
          </Button>
        </form>

        {calculationError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {calculationError}
          </div>
        )}

        {results && (
          <div className="mt-8 space-y-8">
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm">
              <FramesResults results={results} />
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm">
              <FrameShearForceDiagram results={results} />
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm">
              <FrameBendingMomentDiagram results={results} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
