import { useMemo } from "react";

import {
  buildBaselineComparisonRows,
  calculateAverages,
  calculateBaselineDeviation,
  calculateMaxDeviation,
  getBaselineStatus,
} from "@/lib/calculations";
import type { MeasurementDatasetWithRelations, MeasurementFilter } from "@/lib/types";

export function useMeasurementSummary(
  datasets: MeasurementDatasetWithRelations[],
  filters: Pick<MeasurementFilter, "freqHz" | "level">,
) {
  return useMemo(() => {
    const allRecords = datasets.flatMap((dataset) => dataset.records);
    const averageValues = calculateAverages(allRecords);
    const maxDeviationCandidates: number[] = [];

    for (const dataset of datasets) {
      if (!dataset.baseline) {
        continue;
      }
      const datasetAverage = calculateAverages(dataset.records);
      const deviation = calculateBaselineDeviation(datasetAverage, dataset.baseline);
      const maxDeviation = calculateMaxDeviation(deviation);
      if (maxDeviation !== null) {
        maxDeviationCandidates.push(maxDeviation);
      }
    }

    const baselineMaxDeviation =
      maxDeviationCandidates.length > 0 ? Math.max(...maxDeviationCandidates) : null;
    const baselineStatus = getBaselineStatus(baselineMaxDeviation);

    const baselineNames = [
      ...new Set(
        datasets
          .map((dataset) => dataset.baseline?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const baselineDisplayName =
      baselineNames.length === 0 ? "未設定" : baselineNames.length === 1 ? baselineNames[0] : "多個 baseline";

    const selectedFreqHz =
      filters.freqHz.trim() === "" ? undefined : Number(filters.freqHz);
    const selectedLevel = filters.level.trim() === "" ? undefined : Number(filters.level);
    const canBuildBaselineRows =
      datasets.length === 1 &&
      datasets[0].baseline !== null &&
      selectedFreqHz !== undefined &&
      Number.isFinite(selectedFreqHz) &&
      selectedLevel !== undefined &&
      Number.isFinite(selectedLevel);
    const baselineComparisonRows = canBuildBaselineRows
      ? buildBaselineComparisonRows(datasets[0], {
          freqHz: selectedFreqHz as number,
          level: selectedLevel as number,
        })
      : [];

    return {
      measurementRecordCount: allRecords.length,
      averageValues,
      baselineStatus,
      baselineMaxDeviation,
      baselineDisplayName,
      baselineComparisonRows,
    };
  }, [datasets, filters.freqHz, filters.level]);
}
