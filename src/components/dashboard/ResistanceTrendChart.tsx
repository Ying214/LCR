import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { calculateAverages } from "@/lib/calculations";
import type { MeasurementDatasetWithRelations } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";
import { ChartMountGuard } from "@/components/shared/ChartMountGuard";

type ResistanceTrendChartProps = {
  datasets: MeasurementDatasetWithRelations[];
  showAverage: boolean;
  showBaseline: boolean;
  showTrials: boolean;
};

export function ResistanceTrendChart({
  datasets,
  showAverage,
  showBaseline,
  showTrials,
}: ResistanceTrendChartProps) {
  const { data, unsupported } = useMemo(() => {
    if (datasets.length !== 1) {
      return { data: [], unsupported: true };
    }

    const targetDataset = datasets[0];
    const average = calculateAverages(targetDataset.records);
    const baselineRp = targetDataset.baseline?.rp ?? 0;
    const baselineRs = targetDataset.baseline?.rs ?? 0;

    return {
      unsupported: false,
      data: [...targetDataset.records]
        .sort((a, b) => a.indexNo - b.indexNo)
        .map((record) => ({
          indexNo: record.indexNo,
          rp: record.rp,
          rs: record.rs,
          avgRp: average.rp,
          avgRs: average.rs,
          baselineRp,
          baselineRs,
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

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        目前無可用趨勢資料。
      </div>
    );
  }

  return (
    <ChartMountGuard className="h-[320px] min-h-[320px]">
      <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="indexNo" />
          <YAxis tickFormatter={(value) => formatNumber(Number(value), 2)} />
          <Tooltip formatter={(value) => formatNumber(Number(value), 6)} />
          <Legend />

          {showTrials ? (
            <>
              <Line type="monotone" dataKey="rp" stroke="#2563eb" strokeWidth={2} name="Rp" />
              <Line type="monotone" dataKey="rs" stroke="#f97316" strokeWidth={2} name="Rs" />
            </>
          ) : null}

          {showAverage ? (
            <>
              <Line type="monotone" dataKey="avgRp" stroke="#2563eb" strokeDasharray="6 3" dot={false} name="Rp 平均" />
              <Line type="monotone" dataKey="avgRs" stroke="#f97316" strokeDasharray="6 3" dot={false} name="Rs 平均" />
            </>
          ) : null}

          {showBaseline ? (
            <>
              <Line
                type="monotone"
                dataKey="baselineRp"
                stroke="#1d4ed8"
                strokeDasharray="2 4"
                dot={false}
                name="Rp baseline"
              />
              <Line
                type="monotone"
                dataKey="baselineRs"
                stroke="#ea580c"
                strokeDasharray="2 4"
                dot={false}
                name="Rs baseline"
              />
            </>
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </ChartMountGuard>
  );
}
