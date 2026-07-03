"use client";

import { useMemo } from "react";

import type { DatasetCompareRangeRow } from "@/lib/dataset-compare";
import type { ParameterKey } from "@/lib/types";
import {
  formatCapacitanceByMode,
  formatFrequencyByMode,
  formatLevelByMode,
  formatResistanceByMode,
} from "@/lib/unit-conversion";
import { useAppSettings } from "@/components/settings/SettingsProvider";

type DatasetCompareRangeChartsProps = {
  rows: DatasetCompareRangeRow[];
  showDetails?: boolean;
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

const SERIES_COLORS = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be123c",
  "#1d4ed8",
];

const LABEL_MIN_GAP_PX = 16;

function getSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function placeRangeLabels(
  maxY: number,
  meanY: number,
  minY: number,
  topBound: number,
  bottomBound: number,
): { maxLabelY: number; meanLabelY: number; minLabelY: number } {
  let topY = Math.min(Math.max(maxY - 8, topBound), bottomBound);
  let midY = Math.min(Math.max(meanY - 8, topBound), bottomBound);
  let bottomY = Math.min(Math.max(minY + 12, topBound), bottomBound);

  midY = Math.max(midY, topY + LABEL_MIN_GAP_PX);
  bottomY = Math.max(bottomY, midY + LABEL_MIN_GAP_PX);

  if (bottomY > bottomBound) {
    const shiftUp = bottomY - bottomBound;
    topY -= shiftUp;
    midY -= shiftUp;
    bottomY -= shiftUp;
  }

  if (topY < topBound) {
    const shiftDown = topBound - topY;
    topY += shiftDown;
    midY += shiftDown;
    bottomY += shiftDown;
  }

  if (bottomY > bottomBound) {
    bottomY = bottomBound;
    midY = bottomY - LABEL_MIN_GAP_PX;
    topY = midY - LABEL_MIN_GAP_PX;
  }

  if (topY < topBound) {
    topY = topBound;
    midY = topY + LABEL_MIN_GAP_PX;
    bottomY = midY + LABEL_MIN_GAP_PX;
  }

  return {
    maxLabelY: topY,
    meanLabelY: midY,
    minLabelY: bottomY,
  };
}

function formatParameterValue(
  parameter: ParameterKey,
  value: number | null,
  displayMode: "standard" | "friendly",
): string {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistanceByMode(value, displayMode)
    : formatCapacitanceByMode(value, displayMode);
}

function formatFrequencyCompact(value: number | null, displayMode: "standard" | "friendly"): string {
  const formatted = formatFrequencyByMode(value, displayMode);
  return formatted === "--" ? "--" : formatted.replace(/\s+/g, "");
}

function formatLevelCompact(value: number | null, displayMode: "standard" | "friendly"): string {
  return formatLevelByMode(value, displayMode).replace(/\s+/g, "");
}

function formatShortTargetCode(targetCode: string): string {
  const match = /^Sample\s+(\d+)$/.exec(targetCode);
  return match ? `S${match[1]}` : targetCode;
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
  showDetails,
}: {
  rows: DatasetCompareRangeRow[];
  parameter: ParameterKey;
  title: string;
  unitLabel: string;
  showDetails: boolean;
}) {
  const { settings } = useAppSettings();
  const axisRange = useMemo(() => buildAxisRange(rows, parameter), [rows, parameter]);
  const hasExportableData = rows.some((row) => {
    const range = row.ranges[parameter];
    return range.min !== null || range.mean !== null || range.max !== null;
  });

  const chartWidth = 920;
  const left = 92;
  const right = 42;
  const top = 22;
  const bottom = 66;
  const plotLeft = left;
  const plotRight = chartWidth - right;
  const chartHeight = 340;
  const plotTop = top;
  const plotBottom = chartHeight - bottom;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;
  const capHalfWidth = 8;

  const toY = (value: number) => {
    const ratio = (value - axisRange.min) / (axisRange.max - axisRange.min);
    return plotBottom - ratio * plotHeight;
  };

  const categoryRatios = useMemo(() => {
    if (rows.length <= 1) return [0.5];
    if (rows.length === 2) return [0.4, 0.6];
    if (rows.length === 3) return [0.3, 0.5, 0.7];
    return rows.map((_, index) => index / (rows.length - 1));
  }, [rows]);

  const toCategoryX = (index: number) => {
    const ratio = categoryRatios[index] ?? 0.5;
    return plotLeft + ratio * plotWidth;
  };

  const ticks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = axisRange.max - (axisRange.max - axisRange.min) * ratio;
    return { y: plotTop + ratio * plotHeight, value };
  });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-slate-900">
          {title} <span className="text-base font-normal text-slate-800">({settings.displayMode === "standard" ? unitLabel : "auto"})</span>
        </p>
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-slate-700" />
            平均值 (mean)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative inline-block h-3 w-2">
              <span className="absolute left-1/2 top-0 h-0.5 w-2 -translate-x-1/2 bg-slate-700" />
              <span className="absolute left-1/2 top-0.5 h-2 w-0.5 -translate-x-1/2 bg-slate-700" />
              <span className="absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 bg-slate-700" />
            </span>
            最大值 / 最小值
          </span>
        </div>
      </div>
      <div className="w-full">
        <svg
          data-export-chart={`scale-${parameter}`}
          data-export-empty={hasExportableData ? undefined : "true"}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block w-full max-w-[920px]"
        >
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#64748b" strokeWidth={1.5} />
          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#64748b" strokeWidth={1.5} />

          {ticks.map((tick) => (
            <g key={`${parameter}-tick-${tick.y}`}>
              <line x1={plotLeft} y1={tick.y} x2={plotRight} y2={tick.y} stroke="#e2e8f0" strokeWidth={1.1} />
              <line x1={plotLeft - 4} y1={tick.y} x2={plotLeft} y2={tick.y} stroke="#334155" strokeWidth={1.3} />
              <text x={plotLeft - 8} y={tick.y + 4} textAnchor="end" fontSize={12} fill="#0f172a">
                {formatParameterValue(parameter, tick.value, settings.displayMode)}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const range = row.ranges[parameter];
            const x = toCategoryX(index);
            const minY = range.min === null ? null : toY(range.min);
            const maxY = range.max === null ? null : toY(range.max);
            const meanY = range.mean === null ? null : toY(range.mean);
            const hasRange = minY !== null && maxY !== null;
            const isSingleValueRange =
              range.min !== null &&
              range.mean !== null &&
              range.max !== null &&
              range.min === range.mean &&
              range.mean === range.max;
            const meanText = formatParameterValue(parameter, range.mean, settings.displayMode);
            const color = getSeriesColor(index);
            const minText = formatParameterValue(parameter, range.min, settings.displayMode);
            const maxText = formatParameterValue(parameter, range.max, settings.displayMode);
            const placedLabels =
              !isSingleValueRange && maxY !== null && meanY !== null && minY !== null
                ? placeRangeLabels(maxY, meanY, minY, plotTop + 6, plotBottom - 6)
                : null;
            const description = [
              `${row.targetCode} ${row.datasetName}`,
              `${row.conditionLabel}`,
              `source=${row.sourceLabel}`,
              `n=${row.recordCount}`,
              `FREQ=${formatFrequencyCompact(row.freqHz, settings.displayMode)}`,
              `LEVEL=${formatLevelCompact(row.level, settings.displayMode)}`,
              `min=${minText}`,
              `mean=${meanText}`,
              `max=${maxText}`,
            ].join(" | ");

            return (
              <g key={`${row.targetId}-${parameter}`}>
                {hasRange ? (
                  !isSingleValueRange ? (
                    <>
                      <line x1={x} y1={maxY} x2={x} y2={minY} stroke={color} strokeWidth={3} />
                      <line x1={x - capHalfWidth} y1={maxY} x2={x + capHalfWidth} y2={maxY} stroke={color} strokeWidth={2.4} />
                      <line x1={x - capHalfWidth} y1={minY} x2={x + capHalfWidth} y2={minY} stroke={color} strokeWidth={2.4} />
                      <text
                        x={x + 10}
                        y={placedLabels?.maxLabelY ?? maxY - 8}
                        textAnchor="start"
                        fontSize={10}
                        fontWeight={600}
                        fill={color}
                      >
                        {maxText}
                      </text>
                      <text
                        x={x + 10}
                        y={placedLabels?.minLabelY ?? minY + 12}
                        textAnchor="start"
                        fontSize={10}
                        fontWeight={600}
                        fill={color}
                      >
                        {minText}
                      </text>
                    </>
                  ) : null
                ) : (
                  <text x={x} y={plotTop + 12} textAnchor="middle" fontSize={12} fill="#92400e">
                    無可用資料
                  </text>
                )}

                {meanY !== null ? (
                  <>
                    <rect x={x - 5} y={meanY - 5} width={10} height={10} fill={color} stroke="#ffffff" strokeWidth={1.5} />
                    <text
                      x={x + 11}
                      y={placedLabels?.meanLabelY ?? meanY - 8}
                      textAnchor="start"
                      fontSize={11}
                      fontWeight={600}
                      fill={color}
                    >
                      {meanText}
                    </text>
                  </>
                ) : null}

                <text x={x} y={plotBottom + 18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0f172a">
                  {formatShortTargetCode(row.targetCode)}
                </text>
                <title>{description}</title>
              </g>
            );
          })}
        </svg>
      </div>
      {showDetails ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row, index) => {
            const color = getSeriesColor(index);
            return (
              <div
                key={`mapping-${parameter}-${row.targetId}`}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-slate-900">{row.targetCode}</span>
                  <span className="truncate text-slate-700">{`${row.datasetName} / ${row.conditionLabel}`}</span>
                </div>
                <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  <p>{`來源: ${row.sourceLabel}`}</p>
                  <p>{`FREQ: ${formatFrequencyCompact(row.freqHz, settings.displayMode)}`}</p>
                  <p>{`LEVEL: ${formatLevelCompact(row.level, settings.displayMode)}`}</p>
                  <p>{`樣本數: ${row.recordCount}`}</p>
                  <p>{`min: ${formatParameterValue(parameter, row.ranges[parameter].min, settings.displayMode)}`}</p>
                  <p>{`mean: ${formatParameterValue(parameter, row.ranges[parameter].mean, settings.displayMode)}`}</p>
                  <p>{`max: ${formatParameterValue(parameter, row.ranges[parameter].max, settings.displayMode)}`}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DatasetCompareRangeCharts({ rows, showDetails = false }: DatasetCompareRangeChartsProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        請先選擇比較樣本。
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
            showDetails={showDetails}
          />
        ))}
      </div>
    </div>
  );
}
