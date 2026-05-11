import type {
  BaselineProfile,
  MeasurementDatasetMetadata,
  MeasurementDatasetWithRelations,
  MeasurementFilterOptions,
  MeasurementOcrMetadata,
} from "@/lib/types";

export type CreateBaselinePayload = {
  name: string;
  conditionLabel?: string;
  freqHz?: number;
  level?: number;
  rp?: number;
  cp?: number;
  rs?: number;
  cs?: number;
  note?: string;
};

export type UpdateBaselinePayload = Partial<CreateBaselinePayload>;

export type CreateMeasurementRecordPayload = {
  indexNo: number;
  freqHz: number;
  level: number;
  rp: number | null;
  cp: number | null;
  rs: number | null;
  cs: number | null;
};

export type CreateMeasurementDatasetPayload = {
  datasetName: string;
  conditionLabel: string;
  note?: string;
  metadata?: MeasurementDatasetMetadata | null;
  baselineId?: string | null;
  records: CreateMeasurementRecordPayload[];
};

export type UpdateMeasurementDatasetPayload = {
  datasetName?: string;
  conditionLabel?: string;
  baselineId?: string | null;
  note?: string | null;
};

export type UpdateMeasurementRecordPayload = {
  freqHz?: number;
  level?: number;
  rp?: number | null;
  cp?: number | null;
  rs?: number | null;
  cs?: number | null;
};

export type BaselineListResponse = {
  data: BaselineProfile[];
};

export type MeasurementDatasetListResponse = {
  data: MeasurementDatasetWithRelations[];
};

export type MeasurementFilterOptionsResponse = {
  data: MeasurementFilterOptions;
};

export type OcrLine = {
  text: string;
  score: number | null;
  dt_score?: number | null;
  box: unknown;
};

export type OcrResult = {
  texts: string[];
  average_score: number | null;
  lines: OcrLine[];
  raw: unknown;
  images?: Record<string, string>;
  saved_json_path?: string | null;
  saved_image_path?: string | null;
  saved_image_paths?: string[];
};

export type OcrMetadata = MeasurementOcrMetadata;

export type OcrServiceResponse = {
  filename: string;
  result_count: number;
  average_score?: number | null;
  lines?: OcrLine[];
  images?: Record<string, string>;
  saved_upload_path?: string;
  saved_json_paths?: string[];
  saved_image_paths?: string[];
  ocrMetadata?: OcrMetadata;
  results: OcrResult[];
};
