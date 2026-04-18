/**
 * Load type constants and labels for frame members.
 *
 * Two separate constant sets are used because columns and beams support
 * different load types:
 *   - Columns can only carry horizontal (lateral) point loads.
 *   - Beams support UDL and point loads (same as the beam calculator).
 */

/** Load types supported by frame beams. */
export const FRAME_BEAM_LOAD_TYPES = {
  NONE: "none",
  CENTER_POINT: "center-point",
  POINT_AT_DISTANCE: "point-at-distance",
  UDL: "udl",
} as const;

/** Human-readable labels for frame beam load types (used in the beam form select). */
export const FRAME_BEAM_LOAD_TYPE_LABELS = {
  [FRAME_BEAM_LOAD_TYPES.NONE]: "No Load",
  [FRAME_BEAM_LOAD_TYPES.CENTER_POINT]: "Point load at center",
  [FRAME_BEAM_LOAD_TYPES.POINT_AT_DISTANCE]:
    "Point load at distance 'a' from left end and 'b' from the right end",
  [FRAME_BEAM_LOAD_TYPES.UDL]:
    "Uniformly distributed load over the whole length",
} as const;

/** Load types supported by frame columns (lateral loads only). */
export const FRAME_FRAME_LOAD_TYPES = {
  CENTER_POINT: "center-point",
  NONE: "none",
} as const;

/** Human-readable labels for frame column load types (used in the column form select). */
export const FRAME_FRAME_LOAD_TYPE_LABELS = {
  [FRAME_BEAM_LOAD_TYPES.CENTER_POINT]: "Point load at center",
  [FRAME_BEAM_LOAD_TYPES.NONE]: "No Load",
} as const;
  NONE: "none",
  CENTER_POINT: "center-point",
  POINT_AT_DISTANCE: "point-at-distance",
  UDL: "udl",
} as const;

export const FRAME_BEAM_LOAD_TYPE_LABELS = {
  [FRAME_BEAM_LOAD_TYPES.NONE]: "No Load",
  [FRAME_BEAM_LOAD_TYPES.CENTER_POINT]: "Point load at center",
  [FRAME_BEAM_LOAD_TYPES.POINT_AT_DISTANCE]:
    "Point load at distance 'a' from left end and 'b' from the right end",
  [FRAME_BEAM_LOAD_TYPES.UDL]:
    "Uniformly distributed load over the whole length",
} as const;

export const FRAME_FRAME_LOAD_TYPES = {
  CENTER_POINT: "center-point",
  NONE: "none",
} as const;

export const FRAME_FRAME_LOAD_TYPE_LABELS = {
  [FRAME_BEAM_LOAD_TYPES.CENTER_POINT]: "Point load at center",
  [FRAME_BEAM_LOAD_TYPES.NONE]: "No Load",
} as const;
