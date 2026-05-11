import type { MeasurementDatasetWithRelations, ParameterKey } from "@/lib/types";

export type DatasetCompareSource = "average" | `index:${number}`;

export type DatasetCompareTarget = {
  id: string;
  datasetId: string;
  source: DatasetCompareSource;
};

export type DatasetCompareSourceOption = {
  value: DatasetCompareSource;
  label: string;
};

export type DatasetCompareValues = Record<ParameterKey, number | null>;

export type DatasetCompareRow = {
  targetCode: string;
  targetId: string;
  datasetId: string;
  datasetName: string;
  conditionLabel: string;
  source: DatasetCompareSource;
  sourceLabel: string;
  freqHz: number | null;
  level: number | null;
  values: DatasetCompareValues;
  recordCount: number;
  missingMessages: string[];
};

export type DatasetParameterRangeStats = {
  min: number | null;
  mean: number | null;
  max: number | null;
};

export type DatasetCompareRangeRow = {
  targetCode: string;
  targetId: string;
  datasetId: string;
  datasetName: string;
  conditionLabel: string;
  freqHz: number | null;
  level: number | null;
  recordCount: number;
  ranges: Record<ParameterKey, DatasetParameterRangeStats>;
  missingMessages: string[];
};

const PARAMETER_KEYS: ParameterKey[] = ["rp", "cp", "rs", "cs"];

function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function getSourceIndex(source: DatasetCompareSource): number | null {
  if (source === "average") {
    return null;
  }
  const parsed = Number(source.replace("index:", ""));
  return Number.isInteger(parsed) ? parsed : null;
}

function toFiniteValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function getDatasetRecordIndexes(dataset: MeasurementDatasetWithRelations): number[] {
  return [...new Set(dataset.records.map((record) => record.indexNo))].sort((a, b) => a - b);
}

export function getDatasetSourceOptions(dataset: MeasurementDatasetWithRelations): DatasetCompareSourceOption[] {
  const recordIndexes = getDatasetRecordIndexes(dataset);
  return [
    { value: "average", label: "平均值" },
    ...recordIndexes.map((indexNo) => ({
      value: `index:${indexNo}` as DatasetCompareSource,
      label: `第 ${indexNo} 筆`,
    })),
  ];
}

export function getSourceLabel(source: DatasetCompareSource): string {
  if (source === "average") {
    return "平均值";
  }
  const indexNo = getSourceIndex(source);
  return indexNo === null ? "未知來源" : `第 ${indexNo} 筆`;
}

export function normalizeTargetSource(
  dataset: MeasurementDatasetWithRelations | null,
  source: DatasetCompareSource,
): DatasetCompareSource {
  if (!dataset) {
    return "average";
  }
  if (source === "average") {
    return "average";
  }

  const indexNo = getSourceIndex(source);
  if (indexNo === null) {
    return "average";
  }
  return dataset.records.some((record) => record.indexNo === indexNo)
    ? source
    : "average";
}

function buildAverageValues(dataset: MeasurementDatasetWithRelations): DatasetCompareValues {
  return {
    rp: mean(toFiniteValues(dataset.records.map((record) => record.rp))),
    cp: mean(toFiniteValues(dataset.records.map((record) => record.cp))),
    rs: mean(toFiniteValues(dataset.records.map((record) => record.rs))),
    cs: mean(toFiniteValues(dataset.records.map((record) => record.cs))),
  };
}

function getUniqueOrNull(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const first = values[0];
  return values.every((value) => value === first) ? first : null;
}

function buildRecordValues(
  dataset: MeasurementDatasetWithRelations,
  indexNo: number,
): { values: DatasetCompareValues; freqHz: number | null; level: number | null } | null {
  const targetRecord = dataset.records.find((record) => record.indexNo === indexNo);
  if (!targetRecord) {
    return null;
  }

  const toFiniteOrNull = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    values: {
      rp: toFiniteOrNull(targetRecord.rp),
      cp: toFiniteOrNull(targetRecord.cp),
      rs: toFiniteOrNull(targetRecord.rs),
      cs: toFiniteOrNull(targetRecord.cs),
    },
    freqHz: Number.isFinite(targetRecord.freqHz) ? targetRecord.freqHz : null,
    level: Number.isFinite(targetRecord.level) ? targetRecord.level : null,
  };
}

function buildMissingMessages(values: DatasetCompareValues, source: DatasetCompareSource): string[] {
  const messages: string[] = [];
  for (const parameter of PARAMETER_KEYS) {
    if (values[parameter] === null) {
      messages.push(`${parameter.toUpperCase()} 缺少可用數值`);
    }
  }
  if (source !== "average" && messages.length > 0) {
    messages.unshift(`${getSourceLabel(source)} 資料不完整或不存在`);
  }
  return messages;
}

function summarizeDatasetParameterRange(
  dataset: MeasurementDatasetWithRelations,
  parameter: ParameterKey,
): DatasetParameterRangeStats {
  const values = toFiniteValues(dataset.records.map((record) => record[parameter]));
  if (values.length === 0) {
    return { min: null, mean: null, max: null };
  }

  return {
    min: Math.min(...values),
    mean: mean(values),
    max: Math.max(...values),
  };
}

function buildRangeMissingMessages(
  ranges: Record<ParameterKey, DatasetParameterRangeStats>,
  datasetExists: boolean,
): string[] {
  if (!datasetExists) {
    return ["找不到對應 dataset"];
  }

  const messages: string[] = [];
  for (const parameter of PARAMETER_KEYS) {
    if (ranges[parameter].mean === null) {
      messages.push(`${parameter.toUpperCase()} 無可用資料`);
    }
  }
  return messages;
}

export function buildDatasetCompareRows(
  datasets: MeasurementDatasetWithRelations[],
  targets: DatasetCompareTarget[],
): DatasetCompareRow[] {
  return targets.map((target, index) => {
    const dataset = datasets.find((item) => item.id === target.datasetId) ?? null;
    const sourceLabel = getSourceLabel(target.source);

    if (!dataset) {
      return {
        targetCode: `C${index + 1}`,
        targetId: target.id,
        datasetId: target.datasetId,
        datasetName: "未選擇 dataset",
        conditionLabel: "--",
        source: target.source,
        sourceLabel,
        freqHz: null,
        level: null,
        values: { rp: null, cp: null, rs: null, cs: null },
        recordCount: 0,
        missingMessages: ["找不到對應 dataset"],
      };
    }

    const sourceIndexNo = getSourceIndex(target.source);
    const averageValues = buildAverageValues(dataset);
    let values: DatasetCompareValues;
    let freqHz: number | null;
    let level: number | null;

    if (sourceIndexNo === null) {
      values = averageValues;
      freqHz = getUniqueOrNull(dataset.records.map((record) => record.freqHz));
      level = getUniqueOrNull(dataset.records.map((record) => record.level));
    } else {
      const selectedRecord = buildRecordValues(dataset, sourceIndexNo);
      if (!selectedRecord) {
        values = { rp: null, cp: null, rs: null, cs: null };
        freqHz = null;
        level = null;
      } else {
        values = selectedRecord.values;
        freqHz = selectedRecord.freqHz;
        level = selectedRecord.level;
      }
    }

    const missingMessages = buildMissingMessages(values, target.source);

    return {
      targetCode: `C${index + 1}`,
      targetId: target.id,
      datasetId: dataset.id,
      datasetName: dataset.datasetName || "未命名 dataset",
      conditionLabel: dataset.conditionLabel || "未設定製程條件",
      source: target.source,
      sourceLabel,
      freqHz,
      level,
      values,
      recordCount: dataset.records.length,
      missingMessages,
    };
  });
}

export function buildDatasetRangeRows(
  datasets: MeasurementDatasetWithRelations[],
  targets: DatasetCompareTarget[],
): DatasetCompareRangeRow[] {
  return targets.map((target, index) => {
    const dataset = datasets.find((item) => item.id === target.datasetId) ?? null;

    if (!dataset) {
      const emptyRanges: Record<ParameterKey, DatasetParameterRangeStats> = {
        rp: { min: null, mean: null, max: null },
        cp: { min: null, mean: null, max: null },
        rs: { min: null, mean: null, max: null },
        cs: { min: null, mean: null, max: null },
      };
      return {
        targetCode: `C${index + 1}`,
        targetId: target.id,
        datasetId: target.datasetId,
        datasetName: "未選擇 dataset",
        conditionLabel: "--",
        freqHz: null,
        level: null,
        recordCount: 0,
        ranges: emptyRanges,
        missingMessages: buildRangeMissingMessages(emptyRanges, false),
      };
    }

    const ranges: Record<ParameterKey, DatasetParameterRangeStats> = {
      rp: summarizeDatasetParameterRange(dataset, "rp"),
      cp: summarizeDatasetParameterRange(dataset, "cp"),
      rs: summarizeDatasetParameterRange(dataset, "rs"),
      cs: summarizeDatasetParameterRange(dataset, "cs"),
    };

    return {
      targetCode: `C${index + 1}`,
      targetId: target.id,
      datasetId: dataset.id,
      datasetName: dataset.datasetName || "未命名 dataset",
      conditionLabel: dataset.conditionLabel || "未設定製程條件",
      freqHz: getUniqueOrNull(dataset.records.map((record) => record.freqHz)),
      level: getUniqueOrNull(dataset.records.map((record) => record.level)),
      recordCount: dataset.records.length,
      ranges,
      missingMessages: buildRangeMissingMessages(ranges, true),
    };
  });
}
