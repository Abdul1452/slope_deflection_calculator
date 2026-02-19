import { CalculationResults } from "../frames/types";

interface FrameBMSFChartsProps {
  results: CalculationResults;
}

export default function FrameShearForceDiagram({
  results,
}: FrameBMSFChartsProps) {
  const svgHeight = 600;
  const svgWidth = 800;
  const margin = { top: 40, right: 60, bottom: 40, left: 60 };

  const frameWidth = svgWidth - margin.left - margin.right;
  const frameHeight = svgHeight - margin.top - margin.bottom;
  const columnWidth = frameWidth * 0.3;
  const beamHeight = frameHeight * 0.3;

  const leftColumnX = margin.left + columnWidth / 2;
  const rightColumnX = svgWidth - margin.right - columnWidth / 2;
  const beamY = margin.top + frameHeight / 3;

  const maxColumnHeight = Math.max(
    ...(results.columnBMSF?.[0]?.sections?.flatMap((s) => s.x) ?? [0]),
    ...(results.columnBMSF?.[1]?.sections?.flatMap((s) => s.x) ?? [0])
  );

  const maxColumnShear = Math.max(
    ...(results.columnBMSF?.[0]?.sections
      ?.flatMap((s) => s.shearForce)
      ?.map(Math.abs) ?? [0]),
    ...(results.columnBMSF?.[1]?.sections
      ?.flatMap((s) => s.shearForce)
      ?.map(Math.abs) ?? [0])
  );

  const maxBeamLength = Math.max(...(results.beamBMSF?.[0]?.x ?? [0]));
  const maxBeamShear = Math.max(
    ...(results.beamBMSF?.[0]?.shearForce?.map(Math.abs) ?? [0])
  );

  // Scale factors
  const heightScale = frameHeight / maxColumnHeight;
  const columnShearScale = columnWidth / (2 * maxColumnShear);
  const beamLengthScale = (rightColumnX - leftColumnX) / maxBeamLength;
  const beamShearScale = beamHeight / (2 * maxBeamShear);

  // Generate paths
  const generateColumnPath = (columnIndex: number) => {
    if (!results.columnBMSF?.[columnIndex]?.sections?.length) {
      return ""; // Return empty path if no data
    }

    const baseX = columnIndex === 0 ? leftColumnX : rightColumnX;
    const points = results.columnBMSF[columnIndex].sections.flatMap((section) =>
      section.x.map((x, i) => {
        const height = Math.min(
          x * heightScale,
          svgHeight - margin.bottom - beamY
        );
        return {
          x:
            baseX +
            (columnIndex === 0 ? -1 : 1) *
              (section.shearForce[i] ?? 0) *
              columnShearScale,
          y: svgHeight - margin.bottom - height,
        };
      })
    );

    if (points.length === 0) return ""; // Return empty path if no points

    // Create closed path by adding points back along the column centerline
    const pathD =
      points
        .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
        .join(" ") +
      // Draw horizontal line to centerline
      ` L ${baseX} ${points[points.length - 1].y}` +
      // Draw down the centerline
      ` L ${baseX} ${svgHeight - margin.bottom}` +
      // Draw horizontal line to first point
      ` L ${points[0].x} ${svgHeight - margin.bottom}` +
      // Close the path
      " Z";

    return pathD;
  };

  const generateBeamPath = () => {
    if (
      !results.beamBMSF?.[0]?.x?.length ||
      !results.beamBMSF[0].shearForce?.length
    ) {
      return ""; // Return empty path if no data
    }

    const points = results.beamBMSF[0].x.map((x, i) => ({
      x: leftColumnX + x * beamLengthScale,
      y: beamY - (results.beamBMSF[0].shearForce[i] ?? 0) * beamShearScale,
    }));

    if (points.length === 0) return ""; // Return empty path if no points

    // Create closed path by adding points back along the beam centerline
    const pathD =
      points
        .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
        .join(" ") +
      // Draw vertical line to centerline
      ` L ${points[points.length - 1].x} ${beamY}` +
      // Draw along the centerline
      ` L ${points[0].x} ${beamY}` +
      // Close the path
      " Z";

    return pathD;
  };

  return (
    <div className="space-y-8 mt-8">
      <div className="border-t border-white/20 pt-8">
        <h3 className="text-2xl font-bold text-white mb-6">
          Shear Force Diagram
        </h3>
      </div>
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
        <svg width={svgWidth} height={svgHeight}>
          {/* Define gradients */}
          <defs>
            <linearGradient id="sfGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.1)" />
            </linearGradient>
          </defs>

          {/* Frame centerlines */}
          {results.columnBMSF?.map(
            (column, index) =>
              column?.sections?.length > 0 && (
                <line
                  key={`centerline-${index}`}
                  x1={index === 0 ? leftColumnX : rightColumnX}
                  y1={svgHeight - margin.bottom}
                  x2={index === 0 ? leftColumnX : rightColumnX}
                  y2={beamY}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              )
          )}

          {/* Beam centerline */}
          {results.beamBMSF?.[0]?.x?.length > 0 && (
            <line
              x1={leftColumnX}
              y1={beamY}
              x2={rightColumnX}
              y2={beamY}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
          )}

          {/* Column and Beam shear force diagrams - update the styling */}
          {results.columnBMSF?.map(
            (column, index) =>
              column?.sections?.length > 0 && (
                <path
                  key={`column-${index}`}
                  d={generateColumnPath(index)}
                  fill="url(#sfGradient)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  className="transition-all duration-300 ease-in-out"
                />
              )
          )}

          {results.beamBMSF?.[0]?.x?.length > 0 && (
            <path
              d={generateBeamPath()}
              fill="url(#sfGradient)"
              stroke="#38bdf8"
              strokeWidth="2.5"
              className="transition-all duration-300 ease-in-out"
            />
          )}

          {/* Update text styling */}
          {/* Shear force values */}
          {results.columnBMSF?.map((column, colIndex) =>
            column?.sections?.map((section, sectionIndex) =>
              section.shearForce.map((force, i) => {
                if (force === undefined) return null;
                const height = Math.min(
                  (section.x[i] ?? 0) * heightScale,
                  svgHeight - margin.bottom - beamY
                );
                return (
                  <text
                    key={`force-${colIndex}-${sectionIndex}-${i}`}
                    x={
                      (colIndex === 0 ? leftColumnX : rightColumnX) +
                      (colIndex === 0 ? -1 : 1) * force * columnShearScale
                    }
                    y={svgHeight - margin.bottom - height - 10}
                    textAnchor={force >= 0 ? "end" : "start"}
                    fill="#94a3b8"
                    fontSize="13"
                    fontWeight="500"
                    className="select-none"
                  >
                    {force.toFixed(1)} kN
                  </text>
                );
              })
            )
          )}

          {/* Update beam text styling */}
          {results.beamBMSF?.[0]?.shearForce?.map((force, i) => {
            if (force === undefined) return null;
            const x = results.beamBMSF[0].x[i] ?? 0;

            // Only show labels for start, end, and zero shear force points
            if (
              x === 0 || // Start point
              x === results.beamBMSF[0].x[results.beamBMSF[0].x.length - 1] || // End point
              force === 0 // Zero shear force point (max moment)
            ) {
              if (
                force === 0 &&
                results.beamBMSF?.[0]?.bendingMoment?.[i] !== undefined
              ) {
                // Show max moment at zero shear force point
                return (
                  <text
                    key={`beam-force-${i}`}
                    x={leftColumnX + x * beamLengthScale + 5}
                    y={beamY - 5}
                    textAnchor="start"
                    fill="#94a3b8"
                    fontSize="13"
                    fontWeight="500"
                    className="select-none"
                  >
                    {results.beamBMSF[0].bendingMoment[i].toFixed(1)} kN⋅m
                  </text>
                );
              } else {
                // Show shear force values for start and end points
                return (
                  <text
                    key={`beam-force-${i}`}
                    x={leftColumnX + x * beamLengthScale + 5}
                    y={beamY - force * beamShearScale - 5}
                    textAnchor="start"
                    fill="#94a3b8"
                    fontSize="13"
                    fontWeight="500"
                    className="select-none"
                  >
                    {force.toFixed(1)} kN
                  </text>
                );
              }
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
}
