export const LOAD_TYPES = {
  NONE: "none",
  CENTER_POINT: "center-point",
  POINT_AT_DISTANCE: "point-at-distance",
  TWO_POINT_LOADS: "two-point-loads",
  THREE_POINT_LOADS: "three-point-loads",
  UDL: "udl",
  VDL_RIGHT: "vdl-right",
  VDL_LEFT: "vdl-left",
} as const;

export const LOAD_TYPE_LABELS = {
  [LOAD_TYPES.NONE]: "No Load",
  [LOAD_TYPES.CENTER_POINT]: "Point load at center",
  [LOAD_TYPES.POINT_AT_DISTANCE]:
    "Point load at distance 'a' from left end and 'b' from the right end",
  [LOAD_TYPES.TWO_POINT_LOADS]:
    "Two equal point loads, spaced at 1/3 of the total length from each other",
  [LOAD_TYPES.THREE_POINT_LOADS]:
    "Three equal point loads, spaced at 1/4 of the total length from each other",
  [LOAD_TYPES.UDL]: "Uniformly distributed load over the whole length",
  [LOAD_TYPES.VDL_RIGHT]:
    "Variably distributed load, with highest point on the right end",
  [LOAD_TYPES.VDL_LEFT]:
    "Variably distributed load, with highest point on the left end",
} as const;
