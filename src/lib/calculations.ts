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

const PARAMETER_KEYS: ParameterKey[] = ["rp", "cp", "rs", "cs"];

export function calculateAverages(records: ParameterSource[]): ParameterValues {
  if (records.length === 0) {
    return { rp: 0, cp: 0, rs: 0, cs: 0 };
  }

  const totals = records.reduce(
    (acc, record) => {
      acc.rp += record.rp;
      acc.cp += record.cp;
      acc.rs += record.rs;
      acc.cs += record.cs;
      return acc;
    },
    { rp: 0, cp: 0, rs: 0, cs: 0 },
  );

  return {
    rp: totals.rp / records.length,
    cp: totals.cp / records.length,
    rs: totals.rs / records.length,
    cs: totals.cs / records.length,
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
    const measurementValues = targetRecords.map((record) => record[parameter]);
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
      bucket.rp.push(record.rp);
      bucket.cp.push(record.cp);
      bucket.rs.push(record.rs);
      bucket.cs.push(record.cs);
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
  rp: number;
  cp: number;
  rs: number;
  cs: number;
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
