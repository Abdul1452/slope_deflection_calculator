/**
 * BMSFCharts — app/components/bmsf-charts.tsx
 *
 * Renders the Bending Moment Diagram (BMD) and Shear Force Diagram (SFD)
 * for the continuous beam analysis using Recharts AreaChart.
 *
 * Data flow:
 *   1. Combines all spans' critical points into a single flat array.
 *   2. Sorts them by cumulative beam position (x in metres).
 *   3. Transforms to Recharts data format { position, shearForce, bendingMoment }.
 *   4. Renders two AreaChart components sharing the same X-axis range.
 *
 * Chart choices:
 *   - SFD: type="linear" — piecewise linear shear is correct for these load types.
 *   - BMD: type="monotone" — smooth cubic-spline approximation suits moment curves.
 *   - isAnimationActive={false} — prevents animation clashes with parent Framer Motion.
 *
 * Props:
 *   criticalPoints — Array of SpanCriticalPoints (one per span), each containing
 *                    the structurally notable BMSF values extracted by criticalBMSF.ts.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SpanCriticalPoints } from "../utils/criticalBMSF";

interface BMSFChartsProps {
  criticalPoints: SpanCriticalPoints[];
}

export default function BMSFCharts({ criticalPoints }: BMSFChartsProps) {
  // Combine all critical points from all spans
  const allPoints = criticalPoints.flatMap((span) => span.criticalPoints);

  // Sort points by position to ensure correct order
  const sortedPoints = allPoints.sort((a, b) => a.position - b.position);

  // Transform data for Recharts
  const chartData = sortedPoints.map((point) => ({
    position: point.position,
    shearForce: point.shearForce,
    bendingMoment: point.bendingMoment,
  }));

  // Extract unique positions for XAxis ticks
  const uniquePositions = Array.from(
    new Set(chartData.map((item) => item.position))
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shear Force Diagram</h3>
        <div className="bg-secondary p-4 rounded-lg h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 60, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="position"
                type="number"
                ticks={uniquePositions}
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value: number) => value.toFixed(2)}
                label={{
                  value: "Position (m)",
                  position: "insideBottom",
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: "Force (kN)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -45,
                }}
              />
              <Tooltip />
              <Area
                type="linear"
                dataKey="shearForce"
                stroke="rgb(53, 162, 235)"
                fill="rgba(53, 162, 235, 0.5)"
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Bending Moment Diagram</h3>
        <div className="bg-secondary p-4 rounded-lg h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 60, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="position"
                type="number"
                ticks={uniquePositions}
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value: number) => value.toFixed(2)}
                label={{
                  value: "Position (m)",
                  position: "insideBottom",
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: "Moment (kNm)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -45,
                }}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="bendingMoment"
                stroke="rgb(255, 99, 132)"
                fill="rgba(255, 99, 132, 0.5)"
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
