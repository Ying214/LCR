import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  buildConditionComparisonSeries,
  buildConditionComparisonSummary,
} from "@/lib/calculations";
import type {
  ComparisonMode,
  ConditionComparisonMetric,
  MeasurementDatasetWithRelations,
  ParameterKey,
} from "@/lib/types";
import { formatNumber } from "@/lib/formatters";
import { formatCapacitance, formatResistance } from "@/lib/unit-conversion";
import { ChartMountGuard } from "@/components/shared/ChartMountGuard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ConditionComparisonChartProps = {
  datasets: MeasurementDatasetWithRelations[];
  selectedConditions: string[];
  parameter: ParameterKey;
  mode: ComparisonMode;
  baselineCondition: string;
  showBaselineReference: boolean;
};

type AxisDisplayConfig = {
  label: string;
  factor: number;
};

function getResistanceDisplayConfig(maxAbs: number): AxisDisplayConfig {
  if (maxAbs >= 1e6) {
    return { label: "MΩ", factor: 1e6 };
  }
  if (maxAbs >= 1e3) {
    return { label: "kΩ", factor: 1e3 };
  }
  return { label: "Ω", factor: 1 };
}

function getCapacitanceDisplayConfig(maxAbs: number): AxisDisplayConfig {
  if (maxAbs >= 1) {
    return { label: "F", factor: 1 };
  }
  if (maxAbs >= 1e-3) {
    return { label: "mF", factor: 1e-3 };
  }
  if (maxAbs >= 1e-6) {
    return { label: "uF", factor: 1e-6 };
  }
  if (maxAbs >= 1e-9) {
    return { label: "nF", factor: 1e-9 };
  }
  return { label: "pF", factor: 1e-12 };
}

function formatParameterValue(parameter: ParameterKey, value: number | null): string {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistance(value)
    : formatCapacitance(value);
}

function formatDeltaValue(parameter: ParameterKey, value: number | null): string {
  if (value === null) {
    return "--";
  }
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  if (parameter === "cp" || parameter === "cs") {
    return `${sign}${formatNumber(abs * 1e12, 3)} pF`;
  }
  return `${sign}${formatResistance(abs)}`;
}

function formatDeltaPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatNumber(Math.abs(value), 2)}%`;
}

function deltaTone(value: number | null): { className: string; arrow: string } {
  if (value === null || value === 0) {
    return { className: "text-slate-600", arrow: "→" };
  }
  if (value > 0) {
    return { className: "text-emerald-700", arrow: "↑" };
  }
  return { className: "text-rose-700", arrow: "↓" };
}

function buildConservativeDomain(values: number[]): [number, number] {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;

  const anchor = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1e-12);
  const minSpan = anchor * 0.12;
  const normalizedSpan = Math.max(rawSpan, minSpan);
  const center = (rawMin + rawMax) / 2;
  const padding = normalizedSpan * 0.2;

  const halfSpan = normalizedSpan / 2;
  return [center - halfSpan - padding, center + halfSpan + padding];
}

export function ConditionComparisonChart({
  datasets,
  selectedConditions,
  parameter,
  mode,
  baselineCondition,
  showBaselineReference,
}: ConditionComparisonChartProps) {
  const scopedDatasets = useMemo(() => {
    if (selectedConditions.length === 0) {
      return [];
    }
    return datasets.filter((dataset) => selectedConditions.includes(dataset.conditionLabel));
  }, [datasets, selectedConditions]);

  const summaryRows = useMemo(
    () =>
      buildConditionComparisonSummary(scopedDatasets, mode, {
        conditionOrder: selectedConditions,
        baselineCondition,
      }),
    [baselineCondition, mode, scopedDatasets, selectedConditions],
  );

  const series = useMemo(
    () =>
      buildConditionComparisonSeries(scopedDatasets, mode, parameter, {
        conditionOrder: selectedConditions,
        baselineCondition,
      }),
    [baselineCondition, mode, parameter, scopedDatasets, selectedConditions],
  );

  const baselineValue = series.find((item) => item.isBaseline)?.value ?? null;

  const axisDisplay = useMemo(() => {
    const maxAbs = Math.max(1e-12, ...series.map((item) => Math.abs(item.value)));
    return parameter === "rp" || parameter === "rs"
      ? getResistanceDisplayConfig(maxAbs)
      : getCapacitanceDisplayConfig(maxAbs);
  }, [parameter, series]);

  const yDomain = useMemo<[number, number]>(() => {
    const values = series.flatMap((item) => [item.value, item.baselineValue]);
    return buildConservativeDomain(values);
  }, [series]);

  const renderPointWithLabel = (props: { cx?: number; cy?: number; payload?: unknown }) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) {
      return null;
    }

    const point = payload as (typeof series)[number] | undefined;
    if (!point) {
      return null;
    }

    const valueText = formatParameterValue(parameter, point.value);
    const deltaText = point.isBaseline
      ? "基準"
      : `${formatDeltaValue(parameter, point.deltaValue)} / ${formatDeltaPercent(point.deltaPercent)}`;
    const tone = deltaTone(point.deltaValue);

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={4.6}
          fill="#2563eb"
          stroke="white"
          strokeWidth={1.3}
        />
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fontSize={11}
          fill="#0f172a"
        >
          {valueText}
        </text>
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={10}
          fill={point.isBaseline ? "#64748b" : tone.className === "text-emerald-700" ? "#047857" : tone.className === "text-rose-700" ? "#be123c" : "#64748b"}
        >
          {point.isBaseline ? deltaText : `${tone.arrow} ${deltaText}`}
        </text>
      </g>
    );
  };

  if (selectedConditions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        請至少選擇一個製程條件。
      </div>
    );
  }

  if (series.length === 0 || summaryRows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        選定條件下無可比較資料。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-md border border-slate-200">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2}>製程條件</TableHead>
              <TableHead colSpan={3} className="text-center">Rp</TableHead>
              <TableHead colSpan={3} className="text-center">Cp</TableHead>
              <TableHead colSpan={3} className="text-center">Rs</TableHead>
              <TableHead colSpan={3} className="text-center">Cs</TableHead>
            </TableRow>
            <TableRow>
              {["基準值", "目前值", "Δ"].map((label) => (
                <TableHead key={`rp-${label}`} className="text-center">{label}</TableHead>
              ))}
              {["基準值", "目前值", "Δ"].map((label) => (
                <TableHead key={`cp-${label}`} className="text-center">{label}</TableHead>
              ))}
              {["基準值", "目前值", "Δ"].map((label) => (
                <TableHead key={`rs-${label}`} className="text-center">{label}</TableHead>
              ))}
              {["基準值", "目前值", "Δ"].map((label) => (
                <TableHead key={`cs-${label}`} className="text-center">{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryRows.map((row) => (
              <TableRow key={row.conditionLabel} className={row.isBaseline ? "bg-slate-50" : undefined}>
                <TableCell>
                  {row.conditionLabel}
                  {row.isBaseline ? (
                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">基準</span>
                  ) : null}
                </TableCell>
                {(["rp", "cp", "rs", "cs"] as ParameterKey[]).flatMap((param) => {
                  const metric = row[param] as ConditionComparisonMetric;
                  const tone = deltaTone(metric.deltaValue);
                  return [
                    <TableCell key={`${row.conditionLabel}-${param}-base`} className="font-mono">
                      {formatParameterValue(param, metric.baselineValue)}
                    </TableCell>,
                    <TableCell key={`${row.conditionLabel}-${param}-current`} className="font-mono">
                      {formatParameterValue(param, metric.value)}
                    </TableCell>,
                    <TableCell key={`${row.conditionLabel}-${param}-delta`} className={`font-mono ${tone.className}`}>
                      {metric.deltaValue === null ? "--" : `${tone.arrow} ${formatDeltaValue(param, metric.deltaValue)}`}
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {formatDeltaPercent(metric.deltaPercent)}
                      </p>
                    </TableCell>,
                  ];
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ChartMountGuard className="h-[340px] min-h-[340px] rounded-md border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={340}>
          <LineChart data={series} margin={{ top: 16, right: 16, left: 12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="conditionLabel" />
            <YAxis
              domain={yDomain}
              tickFormatter={(value) => formatNumber(Number(value) / axisDisplay.factor, 4)}
              label={{
                value: `${parameter.toUpperCase()} (${axisDisplay.label})`,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "#334155" },
              }}
              width={94}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const point = payload[0]?.payload as (typeof series)[number] | undefined;
                if (!point) {
                  return null;
                }
                return (
                  <div className="min-w-[220px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm">
                    <p className="mb-2 font-semibold text-slate-900">{point.conditionLabel}</p>
                    <div className="space-y-1 text-slate-700">
                      <p>
                        基準值:{" "}
                        <span className="font-mono font-medium">
                          {formatParameterValue(parameter, point.baselineValue)}
                        </span>
                      </p>
                      <p>
                        目前值:{" "}
                        <span className="font-mono font-medium">
                          {formatParameterValue(parameter, point.value)}
                        </span>
                      </p>
                      <p>
                        相對基準差值:{" "}
                        <span className="font-mono font-medium">
                          {formatDeltaValue(parameter, point.deltaValue)}
                        </span>
                      </p>
                      <p>
                        相對基準百分比:{" "}
                        <span className="font-mono font-medium">
                          {formatDeltaPercent(point.deltaPercent)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.8}
              dot={renderPointWithLabel}
              activeDot={{ r: 6.2, fill: "#1d4ed8" }}
              name={`${parameter.toUpperCase()} (${mode === "average" ? "平均值" : "中位數"})`}
            />
            {showBaselineReference && baselineValue !== null ? (
              <ReferenceLine
                y={baselineValue}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{ value: "基準線", position: "insideTopRight", fill: "#991b1b", fontSize: 12 }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </ChartMountGuard>
    </div>
  );
}
