"use client";

import { useMemo } from "react";

import type { DatasetCompareRangeRow } from "@/lib/dataset-compare";
import { formatLevel } from "@/lib/formatters";
import type { ParameterKey } from "@/lib/types";
import { formatCapacitance, formatFrequencyWithUnit, formatResistance } from "@/lib/unit-conversion";

type DatasetCompareRangeChartsProps = {
  rows: DatasetCompareRangeRow[];
};

type AxisRange = {
  min: number;
  max: number;
};

const PARAMETER_CONFIG: Array<{ key: ParameterKey; title: string; unitLabel: string }> = [
  { key: "rp", title: "Rp 範圍圖", unitLabel: "Ω" },
  { key: "cp", title: "Cp 範圍圖", unitLabel: "F" },
  { key: "rs", title: "Rs 範圍圖", unitLabel: "Ω" },
  { key: "cs", title: "Cs 範圍圖", unitLabel: "F" },
];

function formatParameterValue(parameter: ParameterKey, value: number | null): string {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistance(value)
    : formatCapacitance(value);
}

function formatFrequencyCompact(value: number | null): string {
  const formatted = formatFrequencyWithUnit(value);
  return formatted === "--" ? "--" : formatted.replace(/\s+/g, "");
}

function formatLevelCompact(value: number | null): string {
  return value === null ? "--" : `${formatLevel(value)}V`;
}

function getParameterLabel(parameter: ParameterKey): string {
  if (parameter === "rp") return "Rp";
  if (parameter === "cp") return "Cp";
  if (parameter === "rs") return "Rs";
  return "Cs";
}

function buildAxisRange(rows: DatasetCompareRangeRow[], parameter: ParameterKey): AxisRange {
  const values = rows.flatMap((row) => {
    const range = row.ranges[parameter];
    return [range.min, range.mean, range.max];
  });
  const finiteValues = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (finiteValues.length === 0) {
    return { min: 0, max: 1 };
  }

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const span = rawMax - rawMin;
  const padding = span === 0 ? Math.max(Math.abs(rawMax) * 0.15, 1e-12) : span * 0.12;
  let axisMin = rawMin - padding;
  let axisMax = rawMax + padding;

  if (axisMax <= axisMin) {
    const fallback = Math.max(Math.abs(rawMax) * 0.1, 1e-6);
    axisMin = rawMin - fallback;
    axisMax = rawMax + fallback;
  }

  return { min: axisMin, max: axisMax };
}

function ParameterRangeChart({
  rows,
  parameter,
  title,
  unitLabel,
}: {
  rows: DatasetCompareRangeRow[];
  parameter: ParameterKey;
  title: string;
  unitLabel: string;
}) {
  const axisRange = useMemo(() => buildAxisRange(rows, parameter), [rows, parameter]);

  const chartWidth = 620;
  const left = 74;
  const right = 26;
  const top = 18;
  const bottom = 64;
  const plotLeft = left;
  const plotRight = chartWidth - right;
  const chartHeight = 340;
  const plotTop = top;
  const plotBottom = chartHeight - bottom;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;
  const categoryPaddingRatio =
    rows.length <= 1 ? 0.5 : rows.length === 2 ? 0.32 : rows.length === 3 ? 0.22 : rows.length === 4 ? 0.16 : 0.1;
  const categoryLeft = plotLeft + plotWidth * categoryPaddingRatio;
  const categoryRight = plotRight - plotWidth * categoryPaddingRatio;

  const toY = (value: number) => {
    const ratio = (value - axisRange.min) / (axisRange.max - axisRange.min);
    return plotBottom - ratio * plotHeight;
  };

  const toCategoryX = (index: number) => {
    if (rows.length <= 1) {
      return (categoryLeft + categoryRight) / 2;
    }
    const ratio = index / (rows.length - 1);
    return categoryLeft + ratio * (categoryRight - categoryLeft);
  };

  const ticks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = axisRange.max - (axisRange.max - axisRange.min) * ratio;
    return { y: plotTop + ratio * plotHeight, value };
  });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="mb-2 text-base font-semibold text-slate-900">
        {title} <span className="text-base font-normal text-slate-800">({unitLabel})</span>
      </p>
      <div className="w-full">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
        >
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#64748b" strokeWidth={1.6} />
          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#64748b" strokeWidth={1.6} />

          {ticks.map((tick) => (
            <g key={`${parameter}-tick-${tick.y}`}>
              <line x1={plotLeft - 4} y1={tick.y} x2={plotRight} y2={tick.y} stroke="#e2e8f0" strokeWidth={1.1} />
              <line x1={plotLeft - 4} y1={tick.y} x2={plotLeft} y2={tick.y} stroke="#1e293b" strokeWidth={1.3} />
              <text x={plotLeft - 8} y={tick.y + 4} textAnchor="end" fontSize={13} fill="#0f172a">
                {formatParameterValue(parameter, tick.value)}
              </text>
            </g>
          ))}

          {(() => {
            const points = rows.map((row, index) => {
              const mean = row.ranges[parameter].mean;
              if (mean === null) {
                return null;
              }
              return { x: toCategoryX(index), y: toY(mean) };
            });

            const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
            let previous: { x: number; y: number } | null = null;
            for (const point of points) {
              if (point === null) {
                previous = null;
                continue;
              }
              if (previous) {
                segments.push({ x1: previous.x, y1: previous.y, x2: point.x, y2: point.y });
              }
              previous = point;
            }

            if (segments.length === 0) {
              return null;
            }

            return (
              <g>
                {segments.map((segment, idx) => (
                  <line
                    key={`${parameter}-mean-line-${idx}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke="#1e293b"
                    strokeOpacity={0.78}
                    strokeWidth={2.4}
                  />
                ))}
              </g>
            );
          })()}

          {rows.map((row, index) => {
            const range = row.ranges[parameter];
            const x = toCategoryX(index);
            const minY = range.min === null ? null : toY(range.min);
            const maxY = range.max === null ? null : toY(range.max);
            const meanY = range.mean === null ? null : toY(range.mean);
            const meanText = formatParameterValue(parameter, range.mean);
            const description = [
              `${row.targetCode} ${row.datasetName}`,
              `n=${row.recordCount}`,
              `min=${formatParameterValue(parameter, range.min)}`,
              `mean=${meanText}`,
              `max=${formatParameterValue(parameter, range.max)}`,
            ].join(" | ");

            return (
              <g key={`${row.targetId}-${parameter}`}>
                {minY !== null && maxY !== null ? (
                  <>
                    <line x1={x} y1={maxY} x2={x} y2={minY} stroke="#1d4ed8" strokeWidth={3.1} />
                    <line x1={x - 8} y1={maxY} x2={x + 8} y2={maxY} stroke="#1d4ed8" strokeWidth={2.4} />
                    <line x1={x - 8} y1={minY} x2={x + 8} y2={minY} stroke="#1d4ed8" strokeWidth={2.4} />
                  </>
                ) : (
                  <text x={x} y={plotTop + 12} textAnchor="middle" fontSize={12} fill="#92400e">
                    無可用資料
                  </text>
                )}

                {meanY !== null ? <circle cx={x} cy={meanY} r={6.8} fill="#0f172a" /> : null}

                <text x={x} y={plotBottom + 20} textAnchor="middle" fontSize={14} fill="#0f172a">
                  {row.targetCode}
                </text>
                <title>{description}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 space-y-1 text-[13px] text-slate-800">
        {rows.map((row) => (
          <p key={`mapping-${parameter}-${row.targetId}`} className="break-words leading-relaxed">
            <span className="font-semibold text-slate-900">{`${row.targetCode}: `}</span>
            {`${row.datasetName} ${row.conditionLabel} | FREQ=${formatFrequencyCompact(row.freqHz)} | LEVEL=${formatLevelCompact(row.level)} | ${getParameterLabel(parameter)}=${formatParameterValue(parameter, row.ranges[parameter].mean)}`}
          </p>
        ))}
      </div>
    </div>
  );
}

export function DatasetCompareRangeCharts({ rows }: DatasetCompareRangeChartsProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        請先選擇比較對象。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        固定使用每組 dataset 的全部量測 records 計算 min / mean / max。
      </p>
      <div className="grid gap-3 xl:grid-cols-2">
        {PARAMETER_CONFIG.map((config) => (
          <ParameterRangeChart
            key={`range-${config.key}`}
            rows={rows}
            parameter={config.key}
            title={config.title}
            unitLabel={config.unitLabel}
          />
        ))}
      </div>
    </div>
  );
}
