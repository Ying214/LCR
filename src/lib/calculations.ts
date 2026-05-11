import { BASELINE_DEVIATION_THRESHOLDS } from "@/lib/constants";
import type {
  BaselineComparisonRow,
  BaselineStatus,
  ComparisonMode,
  ConditionComparisonPoint,
  ConditionComparisonSummaryRow,
  MeasurementDatasetWithRelations,
  MeasurementRecord,
  ParameterKey,
  ParameterValues,
} from "@/lib/types";

type ParameterSource = Pick<ParameterValues, "rp" | "cp" | "rs" | "cs">;
type NullableParameterSource = {
  rp: number | null;
  cp: number | null;
  rs: number | null;
  cs: number | null;
};

const PARAMETER_KEYS: ParameterKey[] = ["rp", "cp", "rs", "cs"];

function toFiniteNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function calculateAverages(records: NullableParameterSource[]): ParameterValues {
  if (records.length === 0) {
    return { rp: 0, cp: 0, rs: 0, cs: 0 };
  }

  const rpValues = toFiniteNumbers(records.map((record) => record.rp));
  const cpValues = toFiniteNumbers(records.map((record) => record.cp));
  const rsValues = toFiniteNumbers(records.map((record) => record.rs));
  const csValues = toFiniteNumbers(records.map((record) => record.cs));

  const averageOrZero = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    rp: averageOrZero(rpValues),
    cp: averageOrZero(cpValues),
    rs: averageOrZero(rsValues),
    cs: averageOrZero(csValues),
  };
}

export function calculateBaselineDeviation(
  current: ParameterValues,
  baseline:
    | {
        rp?: number | null;
        cp?: number | null;
        rs?: number | null;
        cs?: number | null;
      }
    | null,
): ParameterValues | null {
  if (!baseline) {
    return null;
  }

  const safeDeviation = (currentValue: number, baselineValue?: number | null) => {
    if (baselineValue === undefined || baselineValue === null || baselineValue === 0) {
      return 0;
    }
    return ((currentValue - baselineValue) / baselineValue) * 100;
  };

  return {
    rp: safeDeviation(current.rp, baseline.rp),
    cp: safeDeviation(current.cp, baseline.cp),
    rs: safeDeviation(current.rs, baseline.rs),
    cs: safeDeviation(current.cs, baseline.cs),
  };
}

export function calculateMaxDeviation(deviations: ParameterValues | null): number | null {
  if (!deviations) {
    return null;
  }

  return Math.max(
    Math.abs(deviations.rp),
    Math.abs(deviations.cp),
    Math.abs(deviations.rs),
    Math.abs(deviations.cs),
  );
}

export function getBaselineStatus(maxDeviation: number | null): BaselineStatus {
  if (maxDeviation === null) {
    return "未設定";
  }
  if (maxDeviation <= BASELINE_DEVIATION_THRESHOLDS.normalMax) {
    return "正常";
  }
  if (maxDeviation <= BASELINE_DEVIATION_THRESHOLDS.warningMax) {
    return "注意";
  }
  return "異常";
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function buildBaselineComparisonRows(
  dataset: MeasurementDatasetWithRelations,
  options?: {
    freqHz?: number;
    level?: number;
  },
): BaselineComparisonRow[] {
  if (!dataset.baseline) {
    return [];
  }

  const targetRecords = dataset.records.filter((record) => {
    const matchedFreq = options?.freqHz === undefined ? true : record.freqHz === options.freqHz;
    const matchedLevel = options?.level === undefined ? true : record.level === options.level;
    return matchedFreq && matchedLevel;
  });

  return PARAMETER_KEYS.map((parameter) => {
    const measurementValues = toFiniteNumbers(targetRecords.map((record) => record[parameter]));
    const averageValue =
      measurementValues.length > 0 ? measurementValues.reduce((sum, value) => sum + value, 0) / measurementValues.length : null;
    const baselineValue = dataset.baseline?.[parameter] ?? null;
    const deviationPercent =
      averageValue !== null && baselineValue !== null && baselineValue !== 0
        ? ((averageValue - baselineValue) / baselineValue) * 100
        : null;

    return {
      parameter,
      baselineValue,
      measurementValues,
      averageValue,
      deviationPercent,
    };
  });
}

export function buildConditionComparisonSeries(
  datasets: MeasurementDatasetWithRelations[],
  mode: ComparisonMode,
  parameter: ParameterKey,
  options?: {
    conditionOrder?: string[];
    baselineCondition?: string;
  },
): ConditionComparisonPoint[] {
  const summaryRows = buildConditionComparisonSummary(datasets, mode, options);

  return summaryRows.map((row) => ({
    conditionLabel: row.conditionLabel,
    value: row[parameter].value,
    baselineValue: row[parameter].baselineValue,
    deltaValue: row[parameter].deltaValue,
    deltaPercent: row[parameter].deltaPercent,
    isBaseline: row.isBaseline,
    sampleCount: row.sampleCount,
  }));
}

export function buildConditionComparisonSummary(
  datasets: MeasurementDatasetWithRelations[],
  mode: ComparisonMode,
  options?: {
    conditionOrder?: string[];
    baselineCondition?: string;
  },
) : ConditionComparisonSummaryRow[] {
  const grouped = new Map<
    string,
    {
      rp: number[];
      cp: number[];
      rs: number[];
      cs: number[];
      sampleCount: number;
    }
  >();

  for (const dataset of datasets) {
    if (!grouped.has(dataset.conditionLabel)) {
      grouped.set(dataset.conditionLabel, {
        rp: [],
        cp: [],
        rs: [],
        cs: [],
        sampleCount: 0,
      });
    }

    const bucket = grouped.get(dataset.conditionLabel);
    if (!bucket) {
      continue;
    }

    for (const record of dataset.records) {
      if (typeof record.rp === "number" && Number.isFinite(record.rp)) {
        bucket.rp.push(record.rp);
      }
      if (typeof record.cp === "number" && Number.isFinite(record.cp)) {
        bucket.cp.push(record.cp);
      }
      if (typeof record.rs === "number" && Number.isFinite(record.rs)) {
        bucket.rs.push(record.rs);
      }
      if (typeof record.cs === "number" && Number.isFinite(record.cs)) {
        bucket.cs.push(record.cs);
      }
      bucket.sampleCount += 1;
    }
  }

  const aggregated = Array.from(grouped.entries())
    .map(([conditionLabel, values]) => {
      const rpValue =
        values.rp.length === 0
          ? null
          : mode === "average"
            ? values.rp.reduce((sum, current) => sum + current, 0) / values.rp.length
            : calculateMedian(values.rp);
      const cpValue =
        values.cp.length === 0
          ? null
          : mode === "average"
            ? values.cp.reduce((sum, current) => sum + current, 0) / values.cp.length
            : calculateMedian(values.cp);
      const rsValue =
        values.rs.length === 0
          ? null
          : mode === "average"
            ? values.rs.reduce((sum, current) => sum + current, 0) / values.rs.length
            : calculateMedian(values.rs);
      const csValue =
        values.cs.length === 0
          ? null
          : mode === "average"
            ? values.cs.reduce((sum, current) => sum + current, 0) / values.cs.length
            : calculateMedian(values.cs);

      if (rpValue === null || cpValue === null || rsValue === null || csValue === null) {
        return null;
      }

      return {
        conditionLabel,
        sampleCount: values.sampleCount,
        rp: rpValue,
        cp: cpValue,
        rs: rsValue,
        cs: csValue,
      };
    })
    .filter(
      (
        item,
      ): item is {
        conditionLabel: string;
        sampleCount: number;
        rp: number;
        cp: number;
        rs: number;
        cs: number;
      } => item !== null,
    );

  const rowMap = new Map(aggregated.map((row) => [row.conditionLabel, row]));
  const preferredOrder = options?.conditionOrder ?? [];
  const orderedLabels = [
    ...preferredOrder.filter((label) => rowMap.has(label)),
    ...aggregated
      .map((row) => row.conditionLabel)
      .filter((label) => !preferredOrder.includes(label))
      .sort((a, b) => a.localeCompare(b, "zh-Hant")),
  ];

  if (orderedLabels.length === 0) {
    return [];
  }

  const baselineLabel =
    options?.baselineCondition && rowMap.has(options.baselineCondition)
      ? options.baselineCondition
      : orderedLabels[0];
  const baselineValues = rowMap.get(baselineLabel);

  if (!baselineValues) {
    return [];
  }

  const buildMetric = (value: number, baselineValue: number) => {
    const deltaValue = value - baselineValue;
    const deltaPercent = baselineValue === 0 ? null : (deltaValue / baselineValue) * 100;
    return {
      baselineValue,
      value,
      deltaValue,
      deltaPercent,
    };
  };

  return orderedLabels.map((conditionLabel) => {
    const row = rowMap.get(conditionLabel);
    if (!row) {
      return {
        conditionLabel,
        isBaseline: false,
        sampleCount: 0,
        rp: { baselineValue: 0, value: 0, deltaValue: null, deltaPercent: null },
        cp: { baselineValue: 0, value: 0, deltaValue: null, deltaPercent: null },
        rs: { baselineValue: 0, value: 0, deltaValue: null, deltaPercent: null },
        cs: { baselineValue: 0, value: 0, deltaValue: null, deltaPercent: null },
      };
    }

    const isBaseline = conditionLabel === baselineLabel;
    const rp = buildMetric(row.rp, baselineValues.rp);
    const cp = buildMetric(row.cp, baselineValues.cp);
    const rs = buildMetric(row.rs, baselineValues.rs);
    const cs = buildMetric(row.cs, baselineValues.cs);

    return {
      conditionLabel,
      isBaseline,
      sampleCount: row.sampleCount,
      rp: isBaseline
        ? { baselineValue: rp.baselineValue, value: rp.value, deltaValue: 0, deltaPercent: 0 }
        : rp,
      cp: isBaseline
        ? { baselineValue: cp.baselineValue, value: cp.value, deltaValue: 0, deltaPercent: 0 }
        : cp,
      rs: isBaseline
        ? { baselineValue: rs.baselineValue, value: rs.value, deltaValue: 0, deltaPercent: 0 }
        : rs,
      cs: isBaseline
        ? { baselineValue: cs.baselineValue, value: cs.value, deltaValue: 0, deltaPercent: 0 }
        : cs,
    };
  });
}

export type TrendSeriesPoint = {
  datasetId: string;
  indexNo: number;
  rp: number | null;
  cp: number | null;
  rs: number | null;
  cs: number | null;
  avgRp: number;
  avgCp: number;
  avgRs: number;
  avgCs: number;
  baselineRp: number | null;
  baselineCp: number | null;
  baselineRs: number | null;
  baselineCs: number | null;
};

function sortByIndexNo(records: MeasurementRecord[]): MeasurementRecord[] {
  return [...records].sort((a, b) => a.indexNo - b.indexNo);
}

export function buildTrendSeries(dataset: MeasurementDatasetWithRelations): TrendSeriesPoint[] {
  const sortedRecords = sortByIndexNo(dataset.records);
  const average = calculateAverages(sortedRecords);

  return sortedRecords.map((record) => ({
    datasetId: dataset.id,
    indexNo: record.indexNo,
    rp: record.rp,
    cp: record.cp,
    rs: record.rs,
    cs: record.cs,
    avgRp: average.rp,
    avgCp: average.cp,
    avgRs: average.rs,
    avgCs: average.cs,
    baselineRp: dataset.baseline?.rp ?? null,
    baselineCp: dataset.baseline?.cp ?? null,
    baselineRs: dataset.baseline?.rs ?? null,
    baselineCs: dataset.baseline?.cs ?? null,
  }));
}

export function isSingleDatasetTrendReady(datasets: MeasurementDatasetWithRelations[]): boolean {
  return datasets.length === 1 && datasets[0].records.length > 0;
}
