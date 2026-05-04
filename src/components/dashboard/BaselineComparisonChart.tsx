import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MeasurementDatasetWithRelations, ParameterKey } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";
import { ChartMountGuard } from "@/components/shared/ChartMountGuard";

type BaselineComparisonChartProps = {
  datasets: MeasurementDatasetWithRelations[];
  parameter: ParameterKey;
  showBaseline: boolean;
  showAverage: boolean;
  showTrials: boolean;
};

export function BaselineComparisonChart({
  datasets,
  parameter,
  showBaseline,
  showAverage,
  showTrials,
}: BaselineComparisonChartProps) {
  const { data, hasBaseline, unsupported } = useMemo(() => {
    if (datasets.length !== 1) {
      return { data: [], hasBaseline: false, unsupported: true };
    }

    const targetDataset = datasets[0];
    const baselineValue = targetDataset.baseline?.[parameter] ?? null;
    const sortedRecords = [...targetDataset.records].sort((a, b) => a.indexNo - b.indexNo);
    const average =
      sortedRecords.length > 0
        ? sortedRecords.reduce((sum, record) => sum + record[parameter], 0) / sortedRecords.length
        : 0;

    return {
      unsupported: false,
      hasBaseline: baselineValue !== null,
      data: sortedRecords.map((record) => ({
        indexNo: record.indexNo,
        value: record[parameter],
        average,
        baseline: baselineValue ?? 0,
      })),
    };
  }, [datasets, parameter]);

  if (unsupported) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Baseline 對照圖僅支援單一資料組，請縮小查詢條件。
      </div>
    );
  }

  if (!hasBaseline) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        尚未設定 baseline，無法顯示 baseline 對照圖。
      </div>
    );
  }

  return (
    <ChartMountGuard className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="indexNo" />
          <YAxis tickFormatter={(value) => formatNumber(Number(value), 8)} />
          <Tooltip formatter={(value) => formatNumber(Number(value), 12)} />
          <Legend />

          {showTrials ? (
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} name={parameter.toUpperCase()} />
          ) : null}
          {showAverage ? (
            <Line type="monotone" dataKey="average" stroke="#0f766e" strokeDasharray="6 3" dot={false} name="平均線" />
          ) : null}
          {showBaseline ? (
            <Line type="monotone" dataKey="baseline" stroke="#7c2d12" strokeDasharray="2 4" dot={false} name="baseline 線" />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </ChartMountGuard>
  );
}
