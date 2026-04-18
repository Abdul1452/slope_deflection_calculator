"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CalculatorFormData,
  FixedEndMomentResults,
  SlopeDeflectionEquation,
  Span,
} from "@/typings";
import { LOAD_TYPES } from "../utils/loadTypes";
import {
  Solution,
  solveSimultaneousEquations,
} from "../utils/boundaryCondition";
import { extractCriticalBMSF, SpanCriticalPoints } from "../utils/criticalBMSF";
import { calculateBMSF } from "../utils/calculateBMSF";
import { calculateReactions } from "../utils/calculateReactions";
import { calculateFinalMoments } from "../utils/calculateFinalMoments";
import { generateSlopeDeflectionEquations } from "../utils/slopeDeflection";
import { calculateFixedEndMoments } from "../utils/calculations";
import Results from "../components/results";
import SpanInput from "../components/span-inputs";

const initialSpan: Span = {
  length: 0,
  momentOfInertia: 0,
  loadType: LOAD_TYPES.UDL,
  startSupport: "hinged",
  endSupport: "hinged",
  loadMagnitude: 0,
  pointLoadDistances: { a: 0, b: 0 },
};

export default function CalculatePage() {
  const [formData, setFormData] = useState<CalculatorFormData>({
    modulusOfElasticity: 0,
    momentOfInertia: 0,
    numberOfSpans: 0,
    spans: [],
    sinkingSupports: [],
  });
  const [results, setResults] = useState<FixedEndMomentResults[]>([]);
  const [slopeDeflectionEquations, setSlopeDeflectionEquations] = useState<
    SlopeDeflectionEquation[]
  >([]);
  const [boundaryCondition, setBoundaryCondition] = useState<Solution>({
    thetaB: 0,
    thetaC: 0,
    thetaD: 0,
  });
  const [finalMoments, setFinalMoments] = useState<{ [key: string]: number }>(
    {}
  );
  const [reactions, setReactions] = useState<{ [key: string]: number }>({});
  const [criticalPoints, setCriticalPoints] = useState<SpanCriticalPoints[]>(
    []
  );
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const isValid = validateForm();
    setIsFormValid(isValid);
  }, [formData]);

  const validateForm = () => {
    if (
      formData.modulusOfElasticity <= 0 ||
      formData.momentOfInertia <= 0 ||
      formData.numberOfSpans < 3
    ) {
      return false;
    }

    for (const span of formData.spans) {
      if (
        span.length <= 0 ||
        span.momentOfInertia <= 0 ||
        span.loadMagnitude < 0
      ) {
        return false;
      }
    }

    return true;
  };

  const handleNumberOfSpansChange = (value: number) => {
    const newSpans = Array(value)
      .fill(null)
      .map(() => ({ ...initialSpan }));
    const newSinkingSupports = Array(value + 1).fill(0);

    setFormData((prev) => ({
      ...prev,
      numberOfSpans: value,
      spans: newSpans,
      sinkingSupports: newSinkingSupports,
    }));
  };

  const handleSpanChange = (index: number, span: Span) => {
    setFormData((prev) => ({
      ...prev,
      spans: prev.spans.map((s, i) => (i === index ? span : s)),
    }));
  };

  const handleSinkingSupportChange = (index: number, value: number) => {
    setFormData((prev) => ({
      ...prev,
      sinkingSupports: prev.sinkingSupports.map((s, i) =>
        i === index ? value : s
      ),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Calculate Fixed End Moments
    const fixedEndMoments = formData.spans.map((span, index) => {
      const { start, end } = calculateFixedEndMoments(span);
      const spanLabel =
        String.fromCharCode(65 + index) + String.fromCharCode(66 + index);
      return {
        spanLabel,
        startMoment: start,
        endMoment: end,
      };
    });

    // Generate Slope Deflection Equations
    const equations = generateSlopeDeflectionEquations(
      formData.spans,
      fixedEndMoments,
      formData.sinkingSupports
    );

    const equation1 = equations[0].endEquation + equations[1].startEquation;
    const equation2 = equations[1].endEquation + equations[2].startEquation;
    const lastSpan = formData.spans[formData.spans.length - 1];
    const equation3 =
      lastSpan.endSupport === "hinged" || lastSpan.endSupport === "roller"
        ? equations[2].endEquation
        : null;

    const solutions = solveSimultaneousEquations(
      equation1,
      equation2,
      equation3,
      formData.modulusOfElasticity,
      formData.momentOfInertia
    );

    const EI = formData.modulusOfElasticity * formData.momentOfInertia;
    if (solutions) {
      setCalculationError(null);
      const moments = calculateFinalMoments(
        equations,
        solutions.thetaB,
        solutions.thetaC,
        solutions.thetaD ?? 0,
        EI
      );

      // Calculate reactions using the moments directly instead of from state
      const reactions = calculateReactions(formData.spans, moments);

      const {
        results: bmsfResults,
        startReactions,
        startMoments,
      } = calculateBMSF(formData.spans, moments);
      const criticalPoints = extractCriticalBMSF(
        formData.spans,
        bmsfResults,
        startReactions,
        startMoments
      );

      // Update state with the final results
      setResults(fixedEndMoments);
      setSlopeDeflectionEquations(equations);
      setBoundaryCondition(solutions);
      setFinalMoments(moments);
      setReactions(reactions);
      setCriticalPoints(criticalPoints);
    } else {
      setCalculationError(
        "Could not solve the system of equations. Please check your inputs — the structure may be unstable or the values may be inconsistent."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8"
        >
          <Card className="mx-auto max-w-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center space-x-4">
                <Calculator className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Slope Deflection Calculator
                </h1>
              </div>

              <div className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="length">Number of Spans</Label>
                  <Input
                    type="number"
                    value={formData.numberOfSpans}
                    onChange={(e) =>
                      handleNumberOfSpansChange(parseInt(e.target.value) || 0)
                    }
                    min={0}
                    className="bg-white dark:bg-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="load">Modulus of Elasticity</Label>
                  <Input
                    type="number"
                    value={formData.modulusOfElasticity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        modulusOfElasticity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-white dark:bg-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elasticity">Moment of Inertia (I)</Label>
                  <Input
                    type="number"
                    value={formData.momentOfInertia}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        momentOfInertia: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="gap-4 grid grid-cols-2 items-center border border-chart-1 rounded-lg p-4">
                  {formData.sinkingSupports.map((value, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium mb-1">
                        Sink Support {String.fromCharCode(65 + index)}{" "}
                        <span className="text-chart-1 text-xs">(m)</span>
                      </label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          handleSinkingSupportChange(
                            index,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-white dark:bg-gray-900"
                      />
                    </div>
                  ))}
                </div>
                {formData.spans.map((span, index) => (
                  <div key={index} className="space-y-4">
                    <SpanInput
                      span={span}
                      index={index}
                      onChange={(span) => handleSpanChange(index, span)}
                    />
                  </div>
                ))}

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  disabled={!isFormValid}
                >
                  Calculate
                  <Calculator className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
          {calculationError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm"
            >
              {calculationError}
            </motion.div>
          )}
          {results.length > 0 && (
            <div className="mt-8 space-y-6">
              <Results
                equations={slopeDeflectionEquations}
                boundaryCondition={boundaryCondition}
                finalMoments={finalMoments}
                reactions={reactions}
                criticalPoints={criticalPoints}
                results={results}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
