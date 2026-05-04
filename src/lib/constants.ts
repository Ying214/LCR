import type { BaselineStatus, MeasurementFilter, ParameterKey } from "@/lib/types";

export const BASELINE_DEVIATION_THRESHOLDS = {
  normalMax: 3,
  warningMax: 7,
} as const;

export const PARAMETER_LABELS: Record<ParameterKey, string> = {
  rp: "Rp",
  cp: "Cp",
  rs: "Rs",
  cs: "Cs",
};

export const PARAMETER_COLORS: Record<ParameterKey, string> = {
  rp: "#2563eb",
  cp: "#059669",
  rs: "#f97316",
  cs: "#7c3aed",
};

export const STATUS_COLORS: Record<BaselineStatus, string> = {
  正常: "bg-emerald-100 text-emerald-800 border-emerald-300",
  注意: "bg-amber-100 text-amber-800 border-amber-300",
  異常: "bg-rose-100 text-rose-800 border-rose-300",
  未設定: "bg-slate-100 text-slate-700 border-slate-300",
};

export const KPI_COLOR_CLASSES = {
  measurementCount: "bg-sky-50 border-sky-200",
  baselineStatusNormal: "bg-emerald-50 border-emerald-200",
  baselineStatusWarning: "bg-amber-50 border-amber-200",
  baselineStatusAbnormal: "bg-rose-50 border-rose-200",
  baselineStatusUnset: "bg-slate-100 border-slate-300",
  baselineMaxDeviation: "bg-rose-50 border-rose-200",
  baselineName: "bg-slate-50 border-slate-200",
  avgRp: "bg-orange-50 border-orange-200",
  avgCp: "bg-emerald-50 border-emerald-200",
  avgRs: "bg-violet-50 border-violet-200",
  avgCs: "bg-cyan-50 border-cyan-200",
} as const;

export const DEFAULT_MEASUREMENT_FILTER: MeasurementFilter = {
  datasetName: "",
  conditionLabel: "",
  freqHz: "",
  level: "",
  baselineId: "",
};
