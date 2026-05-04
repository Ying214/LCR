import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { calculateAverages } from "@/lib/calculations";
import type { MeasurementDatasetWithRelations } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";
import { ChartMountGuard } from "@/components/shared/ChartMountGuard";

type CapacitanceTrendChartProps = {
  datasets: MeasurementDatasetWithRelations[];
  showAverage: boolean;
  showBaseline: boolean;
  showTrials: boolean;
};

export function CapacitanceTrendChart({
  datasets,
  showAverage,
  showBaseline,
  showTrials,
}: CapacitanceTrendChartProps) {
  const { data, unsupported } = useMemo(() => {
    if (datasets.length !== 1) {
      return { data: [], unsupported: true };
    }

    const targetDataset = datasets[0];
    const average = calculateAverages(targetDataset.records);
    const baselineCp = targetDataset.baseline?.cp ?? 0;
    const baselineCs = targetDataset.baseline?.cs ?? 0;

    return {
      unsupported: false,
      data: [...targetDataset.records]
        .sort((a, b) => a.indexNo - b.indexNo)
        .map((record) => ({
          indexNo: record.indexNo,
          cp: record.cp,
          cs: record.cs,
          avgCp: average.cp,
          avgCs: average.cs,
          baselineCp,
          baselineCs,
        })),
    };
  }, [datasets]);

  if (unsupported) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        趨勢圖目前僅支援單一資料組，請縮小查詢條件。
      </div>
    );
  }

  return (
    <ChartMountGuard className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="indexNo" />
          <YAxis tickFormatter={(value) => formatNumber(Number(value), 10)} />
          <Tooltip formatter={(value) => formatNumber(Number(value), 12)} />
          <Legend />

          {showTrials ? (
            <>
              <Line type="monotone" dataKey="cp" stroke="#059669" strokeWidth={2} name="Cp" />
              <Line type="monotone" dataKey="cs" stroke="#7c3aed" strokeWidth={2} name="Cs" />
            </>
          ) : null}

          {showAverage ? (
            <>
              <Line type="monotone" dataKey="avgCp" stroke="#047857" strokeDasharray="6 3" dot={false} name="Cp 平均" />
              <Line type="monotone" dataKey="avgCs" stroke="#6d28d9" strokeDasharray="6 3" dot={false} name="Cs 平均" />
            </>
          ) : null}

          {showBaseline ? (
            <>
              <Line
                type="monotone"
                dataKey="baselineCp"
                stroke="#047857"
                strokeDasharray="2 4"
                dot={false}
                name="Cp baseline"
              />
              <Line
                type="monotone"
                dataKey="baselineCs"
                stroke="#6d28d9"
                strokeDasharray="2 4"
                dot={false}
                name="Cs baseline"
              />
            </>
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </ChartMountGuard>
  );
}
