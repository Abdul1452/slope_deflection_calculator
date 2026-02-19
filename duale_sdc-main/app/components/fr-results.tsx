import { CalculationResults } from "../frames/types";

interface ResultsDisplayProps {
  results: CalculationResults;
}

export default function FramesResults({ results }: ResultsDisplayProps) {
  const ResultCard = ({ children }: { children: React.ReactNode }) => (
    <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all hover:bg-secondary/60">
      {children}
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xl font-semibold text-white/90">{children}</h3>
  );

  return (
    <div className="mt-12 space-y-8">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
        Analysis Results
      </h2>
      {results.columns.length > 0 && (
        <div className="space-y-4">
          <SectionTitle>Fixed End Moments - Columns</SectionTitle>
          <div
            className={`grid grid-cols-1 ${
              results.columns.length === 1
                ? "md:grid-cols-1"
                : results.columns.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-2 lg:grid-cols-3"
            } gap-4`}
          >
            {results.columns.map((result, index) => (
              <ResultCard key={index}>
                <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10">
                  {result.label}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Start Moment:</span>
                    <span className="font-mono font-medium">
                      {result.start.toFixed(2)} kN⋅m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">End Moment:</span>
                    <span className="font-mono font-medium">
                      {result.end.toFixed(2)} kN⋅m
                    </span>
                  </div>
                </div>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
      {results.beams.length > 0 && (
        <div className="space-y-4">
          <SectionTitle>Fixed End Moments - Beams</SectionTitle>
          <div
            className={`grid grid-cols-1 ${
              results.beams.length === 1
                ? "md:grid-cols-1"
                : results.beams.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-2 lg:grid-cols-3"
            } gap-4`}
          >
            {results.beams.map((result, index) => (
              <ResultCard key={index}>
                <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10">
                  {result.label}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Start Moment:</span>
                    <span className="font-mono font-medium">
                      {result.start.toFixed(2)} kN⋅m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">End Moment:</span>
                    <span className="font-mono font-medium">
                      {result.end.toFixed(2)} kN⋅m
                    </span>
                  </div>
                </div>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
      {results.slopeDeflectionEquations.length > 0 && (
        <div className="space-y-4">
          <SectionTitle>Slope Deflection Equations</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            {results.slopeDeflectionEquations.map((equation, index) => (
              <ResultCard key={index}>
                <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10">
                  Member {equation.memberLabel}
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-white/70">Start Equation:</span>
                    <div className="font-mono bg-black/30 p-3 rounded-lg">
                      M{equation.memberLabel}s = {equation.startEquation}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-white/70">End Equation:</span>
                    <div className="font-mono bg-black/30 p-3 rounded-lg">
                      M{equation.memberLabel}e = {equation.endEquation}
                    </div>
                  </div>
                </div>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
      {results.boundaryEquations && (
        <div className="space-y-4">
          <SectionTitle>Boundary Equations</SectionTitle>
          <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-white/70">MBA + MBC = 0</span>
                <div className="font-mono bg-black/30 p-3 rounded-lg">
                  {results.boundaryEquations.eq1} = 0
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-white/70">MCB + MCD = 0</span>
                <div className="font-mono bg-black/30 p-3 rounded-lg">
                  {results.boundaryEquations.eq2} = 0
                </div>
              </div>
              {results.boundaryEquations.eq3 && (
                <div className="space-y-2">
                  <span className="text-white/70">MDC = 0</span>
                  <div className="font-mono bg-black/30 p-3 rounded-lg">
                    {results.boundaryEquations.eq3} = 0
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {results.shearEquation && (
        <div className="space-y-4">
          <SectionTitle>Shear Equation</SectionTitle>
          <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-white/70">Simplified Equation</span>
                <div className="font-mono bg-black/30 p-3 rounded-lg">
                  {results.shearEquation.simplifiedEquation.simplifiedEquation}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-white/70">
                  Angular Displacements & Deflection
                </span>
                <div className="font-mono bg-black/30 p-3 rounded-lg space-y-2">
                  <div>EIθB = {results.solution.thetaB}</div>
                  <div>EIθC = {results.solution.thetaC}</div>
                  {results.solution.thetaD !== 0 && (
                    <div>EIθD = {results.solution.thetaD}</div>
                  )}
                  <div>EIδ = {results.solution.delta}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {results.finalMoments && (
        <div className="space-y-4">
          <SectionTitle>Final Moments</SectionTitle>
          <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(results.finalMoments).map(([key, value]) => (
                <ResultCard key={key}>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">{key}:</span>
                    <span className="font-mono font-medium">
                      {value.toFixed(2)} kN⋅m
                    </span>
                  </div>
                </ResultCard>
              ))}
            </div>
          </div>
        </div>
      )}
      {results.horizontalReactions && (
        <div className="space-y-4">
          <SectionTitle>Horizontal Reactions</SectionTitle>
          <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(results.horizontalReactions).map(
                ([key, value]) => (
                  <ResultCard key={key}>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">{key}:</span>
                      <span className="font-mono font-medium">
                        {value.toFixed(2)} kN
                      </span>
                    </div>
                  </ResultCard>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {results.verticalReactions && (
        <div className="space-y-4">
          <SectionTitle>Vertical Reactions</SectionTitle>
          <div className="p-6 bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(results.verticalReactions).map(([key, value]) => (
                <ResultCard key={key}>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">{key}:</span>
                    <span className="font-mono font-medium">
                      {value.toFixed(2)} kN
                    </span>
                  </div>
                </ResultCard>
              ))}
            </div>
          </div>
        </div>
      )}
      {results.columnBMSF && (
        <div className="space-y-4">
          <SectionTitle>Column BMSF Values</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            {results.columnBMSF.map((bmsf, columnIndex) => (
              <ResultCard key={columnIndex}>
                <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10">
                  Column {columnIndex + 1}
                </h4>
                <div className="space-y-6">
                  {bmsf.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                      <h5 className="text-md font-medium text-white/80">
                        Section: {section.sectionLabel}
                      </h5>
                      {section.x.map((x, i) => (
                        <div key={i} className="space-y-2">
                          <div className="text-white/70">
                            At x = {x.toFixed(2)} m:
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">Shear Force:</span>
                            <span className="font-mono font-medium">
                              {section.shearForce[i].toFixed(2)} kN
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">
                              Bending Moment:
                            </span>
                            <span className="font-mono font-medium">
                              {section.bendingMoment[i].toFixed(2)} kN⋅m
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
      {results.beamBMSF && (
        <div className="space-y-4">
          <SectionTitle>Beam BMSF Values</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            {results.beamBMSF.map((bmsf, index) => (
              <ResultCard key={index}>
                <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10">
                  Beam {index + 1}
                </h4>
                <div className="space-y-4">
                  {/* Only display first and last points for UDL */}
                  {bmsf.x.length === 21
                    ? // UDL case - show only start and end points
                      [0, bmsf.x.length - 1].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="text-white/70">
                            At x = {bmsf.x[i].toFixed(2)} m:
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">Shear Force:</span>
                            <span className="font-mono font-medium">
                              {bmsf.shearForce[i].toFixed(2)} kN
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">
                              Bending Moment:
                            </span>
                            <span className="font-mono font-medium">
                              {bmsf.bendingMoment[i].toFixed(2)} kN⋅m
                            </span>
                          </div>
                        </div>
                      ))
                    : // For other load types, show all points
                      bmsf.x.map((x, i) => (
                        <div key={i} className="space-y-2">
                          <div className="text-white/70">
                            At x = {x.toFixed(2)} m:
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">Shear Force:</span>
                            <span className="font-mono font-medium">
                              {bmsf.shearForce[i].toFixed(2)} kN
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">
                              Bending Moment:
                            </span>
                            <span className="font-mono font-medium">
                              {bmsf.bendingMoment[i].toFixed(2)} kN⋅m
                            </span>
                          </div>
                        </div>
                      ))}
                </div>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
