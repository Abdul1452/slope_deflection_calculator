import { Span, SlopeDeflectionEquation } from "@/typings";

export const generateSlopeDeflectionEquations = (
  spans: Span[],
  fixedEndMoments: {
    spanLabel: string;
    startMoment: number;
    endMoment: number;
  }[],
  sinkingSupports: number[]
): SlopeDeflectionEquation[] => {
  const equations: SlopeDeflectionEquation[] = [];

  spans.forEach((span, index) => {
    const startNode = String.fromCharCode(65 + index);
    const endNode = String.fromCharCode(66 + index);
    const spanLabel = startNode + endNode;

    const mOfI = span.momentOfInertia;
    const EI = "EI";
    const baseCoefficient = mOfI > 1 ? mOfI : 1;
    const evaluatedFraction = (2 / span.length).toFixed(2);

    // Handle special case for no support
    if (span.startSupport === "none" || span.endSupport === "none") {
      const w = span.loadMagnitude;
      const L = span.length;
      const isUDL = span.loadType === "udl"; // Check if the load type is UDL

      // If start has no support, only show end moment
      if (span.startSupport === "none" && span.endSupport !== "none") {
        equations.push({
          spanLabel,
          startEquation: "", // No equation for unsupported end
          endEquation: isUDL
            ? `${((w * L * L) / 2).toFixed(2)}`
            : `${(-w * L).toFixed(2)}`, // Use UDL formula if applicable
        });
        return;
      }

      // If end has no support, only show start moment
      if (span.endSupport === "none" && span.startSupport !== "none") {
        equations.push({
          spanLabel,
          startEquation: isUDL
            ? `${((w * L * L) / 2).toFixed(2)}`
            : `${(-w * L).toFixed(2)}`, // Use UDL formula if applicable
          endEquation: "", // No equation for unsupported end
        });
        return;
      }

      // If both ends have no support, no moments
      if (span.startSupport === "none" && span.endSupport === "none") {
        equations.push({
          spanLabel,
          startEquation: "",
          endEquation: "",
        });
        return;
      }
    }

    // Regular case - both ends have supports
    const startThetaCoefficient = (
      2 *
      baseCoefficient *
      Number(evaluatedFraction)
    ).toFixed(2);
    const endThetaCoefficient = (
      baseCoefficient * Number(evaluatedFraction)
    ).toFixed(2);

    const startTheta = span.startSupport === "fixed" ? "" : `θ${startNode}`;
    const endTheta = span.endSupport === "fixed" ? "" : `θ${endNode}`;

    const formatThetaTerm = (coefficient: string, theta: string) => {
      if (!theta) return "";
      const coeff = parseFloat(coefficient);
      return coeff === 1 ? `${EI}${theta}` : `${coefficient}${EI}${theta}`;
    };

    const startThetaExpression = [
      formatThetaTerm(startThetaCoefficient, startTheta),
      formatThetaTerm(endThetaCoefficient, endTheta),
    ]
      .filter(Boolean)
      .join(" + ");

    const endThetaExpression = [
      formatThetaTerm(endThetaCoefficient, startTheta),
      formatThetaTerm(startThetaCoefficient, endTheta),
    ]
      .filter(Boolean)
      .join(" + ");

    const spanFEM = fixedEndMoments.find((fem) => fem.spanLabel === spanLabel);
    const femAB = spanFEM ? spanFEM.startMoment : 0;
    const femBA = spanFEM ? spanFEM.endMoment : 0;

    const startDelta = sinkingSupports[index];
    const endDelta = sinkingSupports[index + 1];
    const deltaValue = endDelta - startDelta;
    const term =
      (parseFloat(evaluatedFraction) * (3 * deltaValue)) / span.length;
    const displacementTerm =
      term !== 0
        ? term < 0
          ? ` + ${Math.abs(term).toFixed(4)}EI`
          : ` - ${term.toFixed(4)}EI`
        : "";

    equations.push({
      spanLabel,
      startEquation: `${femAB.toFixed(
        2
      )} + ${startThetaExpression}${displacementTerm}`,
      endEquation: `${femBA.toFixed(
        2
      )} + ${endThetaExpression}${displacementTerm}`,
    });
  });

  return equations;
};
