"use client";

import { useMemo } from "react";

import type { DatasetCompareRow } from "@/lib/dataset-compare";
import type { ParameterKey } from "@/lib/types";
import { formatLevel } from "@/lib/formatters";
import { formatCapacitance, formatFrequencyWithUnit, formatResistance } from "@/lib/unit-conversion";

import { ChartMountGuard } from "@/components/shared/ChartMountGuard";

type DatasetCompareChartsProps = {
  rows: DatasetCompareRow[];
};

type AxisRange = {
  min: number;
  max: number;
};

const PARAMETER_CONFIG: Array<{ key: ParameterKey; title: string; unitLabel: string }> = [
  { key: "rp", title: "Rp", unitLabel: "Ω" },
  { key: "cp", title: "Cp", unitLabel: "F" },
  { key: "rs", title: "Rs", unitLabel: "Ω" },
  { key: "cs", title: "Cs", unitLabel: "F" },
];

const LINE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be123c",
  "#1d4ed8",
];

function buildAxisRange(
  values: Array<number | null>,
  options?: { clampMinZero?: boolean },
): AxisRange {
  const finiteValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (finiteValues.length === 0) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  const span = max - min;
  const padding =
    span === 0
      ? Math.max(max * 0.12, 1e-12)
      : Math.max(span * 0.14, max * 0.03);

  const axisMin = options?.clampMinZero === true ? Math.max(0, min - padding) : min - padding;
  let axisMax = max + padding;

  if (axisMax <= axisMin) {
    axisMax = axisMin + Math.max(max * 0.1, 1);
  }

  return { min: axisMin, max: axisMax };
}

function formatValue(parameter: ParameterKey, value: number | null) {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistance(value)
    : formatCapacitance(value);
}

function getPointLabelY(y: number, top: number, bottom: number): number {
  const above = y - 10;
  if (above > top + 6) {
    return above;
  }
  return Math.min(y + 14, bottom - 4);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function DatasetCompareCharts({ rows }: DatasetCompareChartsProps) {
  const axisRanges = useMemo(
    () =>
      PARAMETER_CONFIG.reduce<Record<ParameterKey, AxisRange>>((acc, config) => {
        acc[config.key] = buildAxisRange(rows.map((row) => row.values[config.key]), {
          clampMinZero: true,
        });
        return acc;
      }, {} as Record<ParameterKey, AxisRange>),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        請先選擇比較對象。
      </div>
    );
  }

  const chartWidth = 980;
  const chartHeight = 420;
  const left = 100;
  const right = 80;
  const top = 60;
  const bottom = 58;
  const plotHeight = chartHeight - top - bottom;
  const plotTop = top + 10;
  const plotBottom = top + plotHeight - 14;
  const xStep = (chartWidth - left - right) / Math.max(PARAMETER_CONFIG.length - 1, 1);

  const toY = (parameter: ParameterKey, value: number) => {
    const range = axisRanges[parameter];
    const rawRatio = (value - range.min) / (range.max - range.min);
    const ratio = range.min === 0 && value > 0 ? Math.max(rawRatio, 0.03) : rawRatio;
    const normalized = clamp(ratio, 0, 1);
    return plotTop + (1 - normalized) * (plotBottom - plotTop);
  };

  const missingRows = rows.filter((row) => row.missingMessages.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-slate-900">平行座標圖</p>
        <p className="mb-3 text-sm text-slate-700">X 軸：Rp / Cp / Rs / Cs，每條線代表一個比較對象。</p>

        <ChartMountGuard className="h-[430px] min-h-[430px] w-full overflow-x-auto">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="min-w-[860px]"
          >
            {PARAMETER_CONFIG.map((config, axisIndex) => {
              const x = left + axisIndex * xStep;
              const range = axisRanges[config.key];
              const ticks = Array.from({ length: 5 }, (_, tickIndex) => {
                const ratio = tickIndex / 4;
                const value = range.min + (range.max - range.min) * ratio;
                return {
                  y: top + (1 - ratio) * plotHeight,
                  value,
                };
              });

              return (
                <g key={`axis-${config.key}`}>
                  <line x1={x} y1={top} x2={x} y2={top + plotHeight} stroke="#94a3b8" strokeWidth={1.4} />
                  {ticks.map((tick) => (
                    <g key={`${config.key}-${tick.y}`}>
                      <line x1={x - 4} y1={tick.y} x2={x + 4} y2={tick.y} stroke="#475569" strokeWidth={1.2} />
                      <text x={x - 10} y={tick.y + 4} textAnchor="end" fontSize={11} fill="#334155">
                        {formatValue(config.key, tick.value)}
                      </text>
                    </g>
                  ))}
                  <text x={x} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0f172a">
                    {config.title}
                  </text>
                  <text x={x} y={44} textAnchor="middle" fontSize={12} fill="#334155">
                    ({config.unitLabel})
                  </text>
                </g>
              );
            })}

            {rows.map((row, rowIndex) => {
              const color = LINE_COLORS[rowIndex % LINE_COLORS.length];
              const points = PARAMETER_CONFIG.map((config, axisIndex) => {
                const x = left + axisIndex * xStep;
                const rawValue = row.values[config.key];
                const y = rawValue === null ? null : toY(config.key, rawValue);
                return { x, y, key: config.key, value: rawValue };
              });

              const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
              for (let index = 0; index < points.length - 1; index += 1) {
                const current = points[index];
                const next = points[index + 1];
                if (current.y === null || next.y === null) {
                  continue;
                }
                segments.push({ x1: current.x, y1: current.y, x2: next.x, y2: next.y });
              }

              return (
                <g key={row.targetId}>
                  {segments.map((segment, segmentIndex) => (
                    <line
                      key={`${row.targetId}-segment-${segmentIndex}`}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      stroke={color}
                      strokeWidth={3.2}
                      strokeOpacity={0.94}
                    />
                  ))}
                  {points.map((point) => {
                    if (point.y === null) {
                      return null;
                    }
                    const labelText = formatValue(point.key, point.value);
                    const labelY = getPointLabelY(point.y, plotTop, plotBottom);
                    const placeRight = rowIndex % 2 === 0;
                    const labelX = point.x + (placeRight ? 11 : -11);
                    const textAnchor = placeRight ? "start" : "end";
                    const textWidth = Math.max(24, labelText.length * 6.2);
                    const badgeWidth = textWidth + 8;
                    const badgeHeight = 16;
                    const rectX = placeRight ? labelX - 3 : labelX - badgeWidth + 3;
                    const rectY = clamp(labelY - 12, plotTop + 2, plotBottom - badgeHeight + 2);

                    return (
                      <g key={`${row.targetId}-${point.key}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={5.9}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={1.8}
                        />
                        <rect
                          x={rectX}
                          y={rectY}
                          width={badgeWidth}
                          height={badgeHeight}
                          rx={4}
                          ry={4}
                          fill="#ffffff"
                          stroke={color}
                          strokeOpacity={0.45}
                          strokeWidth={1}
                        />
                        <text
                          x={labelX}
                          y={rectY + 11}
                          textAnchor={textAnchor}
                          fontSize={11}
                          fontWeight={600}
                          fill="#0f172a"
                        >
                          {labelText}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </ChartMountGuard>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 report-section">
        <p className="font-semibold text-slate-900">比較對象說明（圖例）</p>
        <p className="mt-1 text-sm text-slate-700">每條線代表一個比較對象 C1 / C2 / C3…</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {rows.map((row, index) => (
            <div key={`legend-${row.targetId}`} className="rounded-md border border-slate-200 bg-white p-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                />
                <p className="font-semibold text-slate-900">
                  {row.targetCode}｜{row.datasetName}
                </p>
              </div>
              <p className="mt-1 text-slate-700">
                {row.conditionLabel}｜{row.sourceLabel}｜records: {row.recordCount}
              </p>
              <p className="mt-1 text-slate-700">
                FREQ: {formatFrequencyWithUnit(row.freqHz)}｜LEVEL: {row.level === null ? "--" : `${formatLevel(row.level)} V`}
              </p>
              <p className="mt-1 text-slate-700">
                Rp: {formatResistance(row.values.rp)}｜Cp: {formatCapacitance(row.values.cp)}
              </p>
              <p className="text-slate-700">
                Rs: {formatResistance(row.values.rs)}｜Cs: {formatCapacitance(row.values.cs)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {missingRows.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">缺值提示</p>
          <ul className="mt-1 space-y-1">
            {missingRows.map((row) => (
              <li key={`missing-${row.targetId}`}>
                {row.targetCode}（{row.datasetName}／{row.sourceLabel}）：{row.missingMessages.join("；")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
