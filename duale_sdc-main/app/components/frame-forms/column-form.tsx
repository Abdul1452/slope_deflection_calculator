/**
 * ColumnForm — app/components/frame-forms/column-form.tsx
 *
 * Renders one input card per column for the portal frame calculator.
 *
 * Each card contains:
 *   - Length (m)
 *   - Moment of Inertia
 *   - Support Type — Radix Select: fixed / hinged / roller / none
 *   - Load Type    — Radix Select populated from FRAME_FRAME_LOAD_TYPES
 *   - Load Magnitude (kN) — shown only when loadType ≠ NONE
 *
 * Calls onColumnChange(index, field, value) for every field change,
 * which merges the update into the parent formData.columns array.
 *
 * Props:
 *   columns        — Array of Column objects (one per column in the frame).
 *   onColumnChange — Partial update callback: (columnIndex, fieldName, newValue).
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FRAME_FRAME_LOAD_TYPES,
  FRAME_FRAME_LOAD_TYPE_LABELS,
} from "@/app/utils/frameloadTypes";
import { Column } from "@/app/frames/types";

interface ColumnFormProps {
  columns: Column[];
  onColumnChange: (index: number, field: keyof Column, value: any) => void;
}

export default function ColumnForm({
  columns,
  onColumnChange,
}: ColumnFormProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Column Details</h2>
      {columns.map((column, index) => (
        <div key={index} className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium">Column {index + 1}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Length <span className="text-chart-2 text-xs">(m)</span>
              </Label>
              <Input
                type="number"
                value={column.length}
                onChange={(e) =>
                  onColumnChange(
                    index,
                    "length",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Moment of Inertia{" "}
                <span className="text-chart-2 text-xs">(I)</span>
              </Label>
              <Input
                type="number"
                value={column.momentOfInertia}
                onChange={(e) =>
                  onColumnChange(
                    index,
                    "momentOfInertia",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Type</Label>
              <Select
                value={column.supportType}
                onValueChange={(value: string) =>
                  onColumnChange(index, "supportType", value)
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="hinged">Hinged</SelectItem>
                  <SelectItem value="roller">Roller</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Load Type</Label>
              <Select
                value={column.loadType}
                onValueChange={(value: string) =>
                  onColumnChange(index, "loadType", value)
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FRAME_FRAME_LOAD_TYPES).map(
                    ([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {FRAME_FRAME_LOAD_TYPE_LABELS[value]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            {column.loadType !== "NONE" && (
              <div className="space-y-2">
                <Label>
                  Load Magnitude{" "}
                  <span className="text-chart-2 text-xs">(kN)</span>
                </Label>
                <Input
                  type="number"
                  value={column.loadMagnitude}
                  onChange={(e) =>
                    onColumnChange(
                      index,
                      "loadMagnitude",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="bg-secondary"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
