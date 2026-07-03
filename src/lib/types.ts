export type ParameterKey = "rp" | "cp" | "rs" | "cs";

export type BaselineStatus = "正常" | "注意" | "異常" | "未設定";

export type ResistanceUnit = "ohm" | "kohm" | "mohm";

export type CapacitanceUnit = "f" | "mf" | "uf" | "nf" | "pf";

export type FrequencyUnit = "hz" | "khz";

export type MeasurementOcrMetadata = {
  datasetNameSuggestion?: string;
  originalFilename?: string;
  originalBaseName?: string;
  uploadTimestamp?: string;
  fileKey?: string;
  folderPath?: string;
  originalImagePath?: string;
  normalizedImagePath?: string;
  markedImagePath?: string;
  rawJsonPath?: string;
  wasConverted?: boolean;
  originalMimeType?: string;
  normalizedMimeType?: string;
};

export type MeasurementDatasetMetadata = {
  ocr?: MeasurementOcrMetadata;
};

export type ParameterValues = {
  rp: number;
  cp: number;
  rs: number;
  cs: number;
};

export type BaselineProfile = {
  id: string;
  name: string;
  conditionLabel: string | null;
  freqHz: number | null;
  level: number | null;
  rp: number | null;
  cp: number | null;
  rs: number | null;
  cs: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementDataset = {
  id: string;
  datasetName: string;
  conditionLabel: string;
  note: string | null;
  metadata?: MeasurementDatasetMetadata | null;
  baselineId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementRecord = {
  id: string;
  datasetId: string;
  indexNo: number;
  freqHz: number;
  level: number;
  rp: number | null;
  cp: number | null;
  rs: number | null;
  cs: number | null;
  freqRawValue: number | null;
  freqRawUnit: string | null;
  levelRawValue: number | null;
  levelRawUnit: string | null;
  rpRawValue: number | null;
  rpRawUnit: string | null;
  cpRawValue: number | null;
  cpRawUnit: string | null;
  rsRawValue: number | null;
  rsRawUnit: string | null;
  csRawValue: number | null;
  csRawUnit: string | null;
  createdAt: string;
};

export type MeasurementDatasetWithRelations = MeasurementDataset & {
  baseline: BaselineProfile | null;
  records: MeasurementRecord[];
};

export type MeasurementFilter = {
  datasetName: string;
  conditionLabel: string;
  freqHz: string;
  level: string;
  baselineId: string;
};

export type MeasurementUnitFields = {
  freqUnit: FrequencyUnit;
  rpUnit: ResistanceUnit;
  cpUnit: CapacitanceUnit;
  rsUnit: ResistanceUnit;
  csUnit: CapacitanceUnit;
};

export type ComparisonMode = "average" | "median";

export type BaselineComparisonRow = {
  parameter: ParameterKey;
  baselineValue: number | null;
  measurementValues: number[];
  averageValue: number | null;
  deviationPercent: number | null;
};

export type MeasurementFilterOptions = {
  conditionLabels: string[];
  frequencies: number[];
  levels: number[];
};

export type ConditionComparisonPoint = {
  conditionLabel: string;
  value: number;
  baselineValue: number;
  deltaValue: number | null;
  deltaPercent: number | null;
  isBaseline: boolean;
  sampleCount: number;
};

export type ConditionComparisonMetric = {
  baselineValue: number;
  value: number;
  deltaValue: number | null;
  deltaPercent: number | null;
};

export type ConditionComparisonSummaryRow = {
  conditionLabel: string;
  isBaseline: boolean;
  sampleCount: number;
  rp: ConditionComparisonMetric;
  cp: ConditionComparisonMetric;
  rs: ConditionComparisonMetric;
  cs: ConditionComparisonMetric;
};

export type TrendRecordSelection = {
  datasetId: string;
  indexNo: number;
};

export type TrendVisibilityControl = {
  showTrials: boolean;
  showAverage: boolean;
  showBaseline: boolean;
};

export type TrendMode = "overview" | "single";
