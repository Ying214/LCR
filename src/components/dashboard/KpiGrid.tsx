import { KPI_COLOR_CLASSES } from "@/lib/constants";
import type { BaselineStatus, ParameterValues } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { formatCapacitance, formatResistance } from "@/lib/unit-conversion";

import { KpiCard } from "@/components/dashboard/KpiCard";

type KpiGridProps = {
  measurementRecordCount: number;
  baselineStatus: BaselineStatus;
  baselineMaxDeviation: number | null;
  baselineDisplayName: string;
  averageValues: ParameterValues;
};

function getBaselineStatusColor(status: BaselineStatus): string {
  if (status === "正常") {
    return KPI_COLOR_CLASSES.baselineStatusNormal;
  }
  if (status === "注意") {
    return KPI_COLOR_CLASSES.baselineStatusWarning;
  }
  if (status === "異常") {
    return KPI_COLOR_CLASSES.baselineStatusAbnormal;
  }
  return KPI_COLOR_CLASSES.baselineStatusUnset;
}

export function KpiGrid({
  measurementRecordCount,
  baselineStatus,
  baselineMaxDeviation,
  baselineDisplayName,
  averageValues,
}: KpiGridProps) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="量測筆數"
        value={formatNumber(measurementRecordCount, 0)}
        colorClass={KPI_COLOR_CLASSES.measurementCount}
      />
      <KpiCard
        title="Baseline 狀態"
        value={baselineStatus}
        colorClass={getBaselineStatusColor(baselineStatus)}
      />
      <KpiCard
        title="Baseline 最大偏差"
        value={baselineMaxDeviation === null ? "--" : formatPercent(baselineMaxDeviation, 2)}
        colorClass={KPI_COLOR_CLASSES.baselineMaxDeviation}
      />
      <KpiCard
        title="Baseline 名稱"
        value={baselineDisplayName}
        colorClass={KPI_COLOR_CLASSES.baselineName}
      />
      <KpiCard title="平均 Rp" value={formatResistance(averageValues.rp)} colorClass={KPI_COLOR_CLASSES.avgRp} />
      <KpiCard title="平均 Cp" value={formatCapacitance(averageValues.cp)} colorClass={KPI_COLOR_CLASSES.avgCp} />
      <KpiCard title="平均 Rs" value={formatResistance(averageValues.rs)} colorClass={KPI_COLOR_CLASSES.avgRs} />
      <KpiCard title="平均 Cs" value={formatCapacitance(averageValues.cs)} colorClass={KPI_COLOR_CLASSES.avgCs} />
    </div>
  );
}
