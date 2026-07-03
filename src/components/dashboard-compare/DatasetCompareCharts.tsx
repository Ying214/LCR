"use client";

import { useMemo, useState } from "react";

import type { DatasetCompareRow } from "@/lib/dataset-compare";
import type { ParameterKey } from "@/lib/types";
import {
  formatCapacitanceByMode,
  formatFrequencyByMode,
  formatLevelByMode,
  formatResistanceByMode,
} from "@/lib/unit-conversion";

import { ChartMountGuard } from "@/components/shared/ChartMountGuard";
import { useAppSettings } from "@/components/settings/SettingsProvider";
import { Checkbox } from "@/components/ui/checkbox";

type DatasetCompareChartsProps = {
  rows: DatasetCompareRow[];
  reportMode?: boolean;
};

type AxisRange = {
  min: number;
  max: number;
};

type HoverTooltipState = {
  x: number;
  y: number;
  targetId: string;
  targetCode: string;
  datasetName: string;
  parameterLabel: string;
  valueLabel: string;
  baselineValueLabel?: string;
  errorPercentLabel?: string;
  referenceLabel?: string;
};

type ChartSegment = {
  key: ParameterKey;
  parameterTitle: string;
  value: number;
  valueLabel: string;
  baseValueLabel?: string;
  errorPercentLabel?: string;
  referenceLabel?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type ChartPoint = {
  key: ParameterKey;
  parameterTitle: string;
  valueLabel: string;
  secondaryLabel?: string;
  baseValueLabel?: string;
  errorPercentLabel?: string;
  referenceLabel?: string;
  x: number;
  y: number;
  labelX: number;
  primaryLabelY: number;
  secondaryLabelY?: number;
  textAnchor: "start" | "end";
  rectX: number;
  rectY: number;
  badgeWidth: number;
  badgeHeight: number;
};

type PlottedRow = {
  row: DatasetCompareRow;
  color: string;
  isBaseline: boolean;
  segments: ChartSegment[];
  points: ChartPoint[];
};

const PARAMETER_CONFIG: Array<{ key: ParameterKey; title: string; unitLabel: string }> = [
  { key: "rp", title: "Rp", unitLabel: "Ω" },
  { key: "cp", title: "Cp", unitLabel: "F" },
  { key: "rs", title: "Rs", unitLabel: "Ω" },
  { key: "cs", title: "Cs", unitLabel: "F" },
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

function getSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

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

function formatValue(parameter: ParameterKey, value: number | null, displayMode: "standard" | "friendly") {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistanceByMode(value, displayMode)
    : formatCapacitanceByMode(value, displayMode);
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

function isBaselineRow(targetId: string): boolean {
  return targetId.startsWith("baseline-");
}

function calculateErrorPercent(measured: number | null, baseline: number | null): number | null {
  if (
    measured === null ||
    baseline === null ||
    !Number.isFinite(measured) ||
    !Number.isFinite(baseline) ||
    baseline === 0
  ) {
    return null;
  }
  return ((measured - baseline) / baseline) * 100;
}

function formatErrorPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function buildPointLabelLayout({
  pointX,
  pointY,
  preferredRight,
  forceSide,
  minLeft,
  valueLabel,
  secondaryLabel,
  chartWidth,
  plotTop,
  plotBottom,
}: {
  pointX: number;
  pointY: number;
  preferredRight: boolean;
  forceSide?: "left" | "right";
  minLeft?: number;
  valueLabel: string;
  secondaryLabel?: string;
  chartWidth: number;
  plotTop: number;
  plotBottom: number;
}): Pick<
  ChartPoint,
  "labelX" | "primaryLabelY" | "secondaryLabelY" | "textAnchor" | "rectX" | "rectY" | "badgeWidth" | "badgeHeight"
> {
  const boundaryPadding = 6;
  const labelGap = 11;
  const textPadding = 5;
  const secondaryWidth = secondaryLabel ? secondaryLabel.length * 6.2 : 0;
  const textWidth = Math.max(24, valueLabel.length * 6.2, secondaryWidth);
  const badgeWidth = textWidth + textPadding * 2;
  const badgeHeight = secondaryLabel ? 32 : 16;

  const rightRectX = pointX + labelGap;
  const leftRectX = pointX - labelGap - badgeWidth;
  const rightFits = rightRectX + badgeWidth <= chartWidth - boundaryPadding;
  const safeLeftBoundary = minLeft ?? boundaryPadding;
  const leftFits = leftRectX >= safeLeftBoundary;
  const placeRight =
    forceSide === "right"
      ? true
      : forceSide === "left"
        ? false
        : preferredRight
          ? rightFits || !leftFits
          : !(leftFits || !rightFits);

  const rawRectX = placeRight ? rightRectX : leftRectX;
  const rectX = clamp(rawRectX, safeLeftBoundary, chartWidth - boundaryPadding - badgeWidth);
  const labelX = placeRight ? rectX + textPadding : rectX + badgeWidth - textPadding;
  const textAnchor = placeRight ? "start" : "end";
  const labelY = getPointLabelY(pointY, plotTop, plotBottom);
  const rectY = clamp(labelY - 12, plotTop + 2, plotBottom - badgeHeight + 2);

  return {
    labelX,
    primaryLabelY: rectY + 11,
    secondaryLabelY: secondaryLabel ? rectY + 25 : undefined,
    textAnchor,
    rectX,
    rectY,
    badgeWidth,
    badgeHeight,
  };
}

function calculateErrorPercentWithAbsBase(currentValue: number | null, baseValue: number | null): number | null {
  if (
    currentValue === null ||
    baseValue === null ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(baseValue) ||
    baseValue === 0
  ) {
    return null;
  }
  return ((currentValue - baseValue) / Math.abs(baseValue)) * 100;
}

export function DatasetCompareCharts({ rows, reportMode = false }: DatasetCompareChartsProps) {
  const { settings } = useAppSettings();
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState | null>(null);
  const [visibleByTargetId, setVisibleByTargetId] = useState<Record<string, boolean>>({});
  const [showErrorOnLabels, setShowErrorOnLabels] = useState(false);

  const resolvedVisibleByTargetId = useMemo(() => {
    const next: Record<string, boolean> = {};
    rows.forEach((row) => {
      next[row.targetId] = visibleByTargetId[row.targetId] ?? true;
    });

    const hasVisible = rows.some((row) => next[row.targetId]);
    if (!hasVisible && rows.length > 0) {
      next[rows[0].targetId] = true;
    }

    return next;
  }, [rows, visibleByTargetId]);

  const effectiveHoverTooltip =
    !reportMode && hoverTooltip && resolvedVisibleByTargetId[hoverTooltip.targetId] ? hoverTooltip : null;

  const visibleRows = useMemo(
    () => rows.filter((row) => resolvedVisibleByTargetId[row.targetId] ?? true),
    [rows, resolvedVisibleByTargetId],
  );

  const colorByTargetId = useMemo(() => {
    const next: Record<string, string> = {};
    rows.forEach((row, index) => {
      next[row.targetId] = getSeriesColor(index);
    });
    return next;
  }, [rows]);

  const visibleCount = useMemo(
    () => rows.reduce((count, row) => (resolvedVisibleByTargetId[row.targetId] ?? true ? count + 1 : count), 0),
    [rows, resolvedVisibleByTargetId],
  );

  const baselineRow = useMemo(
    () => rows.find((row) => isBaselineRow(row.targetId)) ?? null,
    [rows],
  );

  const baselineValues = useMemo(
    () =>
      baselineRow
        ? {
            rp: baselineRow.values.rp,
            cp: baselineRow.values.cp,
            rs: baselineRow.values.rs,
            cs: baselineRow.values.cs,
          }
        : null,
    [baselineRow],
  );

  const referenceRow = useMemo(
    () => rows[0] ?? null,
    [rows],
  );

  const referenceValues = useMemo(
    () =>
      referenceRow
        ? {
            rp: referenceRow.values.rp,
            cp: referenceRow.values.cp,
            rs: referenceRow.values.rs,
            cs: referenceRow.values.cs,
          }
        : null,
    [referenceRow],
  );

  const handleToggleRowVisible = (targetId: string, checked: boolean) => {
    const currentlyVisible = resolvedVisibleByTargetId[targetId] ?? true;
    if (!checked && currentlyVisible && visibleCount <= 1) {
      return;
    }
    setVisibleByTargetId((prev) => ({
      ...prev,
      [targetId]: checked,
    }));
  };

  const axisRanges = useMemo(
    () =>
      PARAMETER_CONFIG.reduce<Record<ParameterKey, AxisRange>>((acc, config) => {
        acc[config.key] = buildAxisRange(visibleRows.map((row) => row.values[config.key]), {
          clampMinZero: true,
        });
        return acc;
      }, {} as Record<ParameterKey, AxisRange>),
    [visibleRows],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        請先選擇比較樣本。
      </div>
    );
  }

  const chartWidth = 1160;
  const chartHeight = 420;
  const left = 210;
  const right = 120;
  const top = 58;
  const bottom = 50;
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

  const plottedRows: PlottedRow[] = visibleRows.map((row, rowIndex) => {
    const color = colorByTargetId[row.targetId] ?? getSeriesColor(rowIndex);
    const isBaseline = isBaselineRow(row.targetId);
    const isReferenceSample = row.targetId === referenceRow?.targetId;

    const points = PARAMETER_CONFIG.map((config, axisIndex) => {
      const x = left + axisIndex * xStep;
      const rawValue = row.values[config.key];
      const y = rawValue === null ? null : toY(config.key, rawValue);
      return { x, y, key: config.key, value: rawValue };
    });

    const segments: ChartSegment[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      if (current.y === null || next.y === null || next.value === null) {
        continue;
      }

      const parameterTitle =
        PARAMETER_CONFIG.find((config) => config.key === next.key)?.title ?? next.key.toUpperCase();
      const valueLabel = formatValue(next.key, next.value, settings.displayMode);
      const baseValue = referenceValues?.[next.key] ?? null;
      const baseValueLabel = formatValue(next.key, baseValue, settings.displayMode);
      const errorPercent = isReferenceSample ? null : calculateErrorPercentWithAbsBase(next.value, baseValue);
      const errorPercentLabel = errorPercent === null ? undefined : formatErrorPercent(errorPercent);

      segments.push({
        key: next.key,
        parameterTitle,
        value: next.value,
        valueLabel,
        baseValueLabel,
        errorPercentLabel,
        referenceLabel: isReferenceSample ? "基準" : undefined,
        x1: current.x,
        y1: current.y,
        x2: next.x,
        y2: next.y,
      });
    }

    const plottedPoints: ChartPoint[] = [];
    points.forEach((point, axisIndex) => {
      if (point.y === null) {
        return;
      }

      const parameterTitle =
        PARAMETER_CONFIG.find((config) => config.key === point.key)?.title ?? point.key.toUpperCase();
      const valueLabel = formatValue(point.key, point.value, settings.displayMode);
      const baseValue = referenceValues?.[point.key] ?? null;
      const baseValueLabel = formatValue(point.key, baseValue, settings.displayMode);
      const baselineValue = baselineValues?.[point.key] ?? null;
      const labelErrorPercent = baselineRow ? calculateErrorPercent(point.value, baselineValue) : null;
      const errorPercent = isReferenceSample ? null : calculateErrorPercentWithAbsBase(point.value, baseValue);
      const errorPercentLabel = errorPercent === null ? undefined : formatErrorPercent(errorPercent);
      const secondaryLabel =
        showErrorOnLabels && baselineRow
          ? isBaseline
            ? "Baseline"
            : `Error: ${formatErrorPercent(labelErrorPercent)}`
          : undefined;
      const preferredRight = rowIndex % 2 === 0;
      const forceSide =
        axisIndex === 0
          ? "left"
          : axisIndex === PARAMETER_CONFIG.length - 1
            ? "right"
            : undefined;
      const labelLayout = buildPointLabelLayout({
        pointX: point.x,
        pointY: point.y,
        preferredRight,
        forceSide,
        valueLabel,
        secondaryLabel,
        chartWidth,
        plotTop,
        plotBottom,
      });

      plottedPoints.push({
        key: point.key,
        parameterTitle,
        valueLabel,
        secondaryLabel,
        baseValueLabel,
        errorPercentLabel,
        referenceLabel: isReferenceSample ? "基準" : undefined,
        x: point.x,
        y: point.y,
        ...labelLayout,
      });
    });

    return {
      row,
      color,
      isBaseline,
      segments,
      points: plottedPoints,
    };
  });

  const missingRows = visibleRows.filter((row) => row.missingMessages.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">平行座標圖</p>
        <p className="mt-1 text-sm text-slate-700">X 軸：Rp / Cp / Rs / Cs，每條線代表一個比較樣本。</p>
        {!reportMode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            {rows.map((row, index) => {
              const isVisible = resolvedVisibleByTargetId[row.targetId] ?? true;
              return (
                <div
                  key={`legend-top-${row.targetId}`}
                  className="flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700"
                >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(checked) => handleToggleRowVisible(row.targetId, checked === true)}
                    aria-label={`切換 ${row.targetCode} 顯示`}
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: colorByTargetId[row.targetId] ?? getSeriesColor(index),
                      opacity: isVisible ? 1 : 0.4,
                    }}
                  />
                  <span className={`font-semibold ${isVisible ? "text-slate-900" : "text-slate-400"}`}>
                    {isBaselineRow(row.targetId) ? `Baseline (${row.targetCode})` : row.targetCode}
                  </span>
                  <span className={isVisible ? "text-slate-500" : "text-slate-400"}>{row.datasetName}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700">
              <Checkbox
                checked={showErrorOnLabels}
                onCheckedChange={(checked) => setShowErrorOnLabels(checked === true)}
                aria-label="切換顯示誤差值"
              />
              <span className="font-semibold text-slate-900">顯示誤差值</span>
            </div>
          </div>
        ) : null}

        <ChartMountGuard
          forceRender={reportMode}
          className={
            reportMode
              ? "relative mt-3 h-auto min-h-0 w-full overflow-visible"
              : "relative mt-3 h-[430px] min-h-[430px] w-full overflow-x-auto"
          }
        >
          <svg
            data-export-chart="compare-overview"
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMinYMid meet"
            className="min-w-[1020px]"
            onMouseLeave={() => setHoverTooltip(null)}
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
                        {formatValue(config.key, tick.value, settings.displayMode)}
                      </text>
                    </g>
                  ))}
                  <text x={x} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0f172a">
                    {config.title}
                  </text>
                  <text x={x} y={44} textAnchor="middle" fontSize={12} fill="#334155">
                    ({settings.displayMode === "standard" ? config.unitLabel : "auto"})
                  </text>
                </g>
              );
            })}

            <g aria-label="chart-lines">
              {plottedRows.map(({ row, color, isBaseline, segments }) =>
                segments.map((segment, segmentIndex) => (
                  <line
                    key={`${row.targetId}-segment-line-${segmentIndex}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke={color}
                    strokeWidth={isBaseline ? 4.2 : 3.2}
                    strokeOpacity={0.94}
                  />
                )),
              )}
            </g>

            <g aria-label="chart-markers">
              {plottedRows.map(({ row, color, isBaseline, points }) =>
                points.map((point) => (
                  <circle
                    key={`${row.targetId}-marker-${point.key}`}
                    cx={point.x}
                    cy={point.y}
                    r={isBaseline ? 6.2 : 5.9}
                    fill={isBaseline ? "#ffffff" : color}
                    stroke={isBaseline ? color : "#ffffff"}
                    strokeWidth={isBaseline ? 2.6 : 1.8}
                  />
                )),
              )}
            </g>

            <g aria-label="chart-labels">
              {plottedRows.map(({ row, color, points }) =>
                points.map((point) => (
                  <g key={`${row.targetId}-label-${point.key}`}>
                    <rect
                      x={point.rectX}
                      y={point.rectY}
                      width={point.badgeWidth}
                      height={point.badgeHeight}
                      rx={4}
                      ry={4}
                      fill="#ffffff"
                      stroke={color}
                      strokeOpacity={0.45}
                      strokeWidth={1}
                    />
                    <text
                      x={point.labelX}
                      y={point.primaryLabelY}
                      textAnchor={point.textAnchor}
                      fontSize={11}
                      fontWeight={600}
                      fill="#0f172a"
                    >
                      {point.valueLabel}
                    </text>
                    {point.secondaryLabel && point.secondaryLabelY ? (
                      <text
                        x={point.labelX}
                        y={point.secondaryLabelY}
                        textAnchor={point.textAnchor}
                        fontSize={10}
                        fontWeight={600}
                        fill="#334155"
                      >
                        {point.secondaryLabel}
                      </text>
                    ) : null}
                  </g>
                )),
              )}
            </g>

            {!reportMode ? (
              <g aria-label="chart-hit-areas">
                {plottedRows.map(({ row, segments, points }) => (
                  <g key={`${row.targetId}-hit-group`}>
                    {segments.map((segment, segmentIndex) => (
                      <line
                        key={`${row.targetId}-segment-hit-${segmentIndex}`}
                        x1={segment.x1}
                        y1={segment.y1}
                        x2={segment.x2}
                        y2={segment.y2}
                        stroke="transparent"
                        strokeWidth={14}
                        onMouseMove={(event) =>
                          setHoverTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            targetId: row.targetId,
                            targetCode: row.targetCode,
                            datasetName: row.datasetName,
                            parameterLabel: segment.parameterTitle,
                            valueLabel: segment.valueLabel,
                            baselineValueLabel: segment.baseValueLabel,
                            errorPercentLabel: segment.errorPercentLabel,
                            referenceLabel: segment.referenceLabel,
                          })
                        }
                        onMouseLeave={() => setHoverTooltip(null)}
                      />
                    ))}
                    {points.map((point) => (
                      <circle
                        key={`${row.targetId}-point-hit-${point.key}`}
                        cx={point.x}
                        cy={point.y}
                        r={9.5}
                        fill="transparent"
                        onMouseMove={(event) =>
                          setHoverTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            targetId: row.targetId,
                            targetCode: row.targetCode,
                            datasetName: row.datasetName,
                            parameterLabel: point.parameterTitle,
                            valueLabel: point.valueLabel,
                            baselineValueLabel: point.baseValueLabel,
                            errorPercentLabel: point.errorPercentLabel,
                            referenceLabel: point.referenceLabel,
                          })
                        }
                        onMouseLeave={() => setHoverTooltip(null)}
                      />
                    ))}
                  </g>
                ))}
              </g>
            ) : null}
          </svg>
          {effectiveHoverTooltip ? (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-md"
              style={{
                left: effectiveHoverTooltip.x + 14,
                top: effectiveHoverTooltip.y + 14,
              }}
            >
              <p className="font-semibold text-slate-900">{effectiveHoverTooltip.targetCode}</p>
              <p className="mt-0.5 text-slate-700">{effectiveHoverTooltip.datasetName}</p>
              <p className="mt-0.5 text-slate-700">參數：{effectiveHoverTooltip.parameterLabel}</p>
              <p className="text-slate-700">數值：{effectiveHoverTooltip.valueLabel}</p>
              {effectiveHoverTooltip.referenceLabel ? (
                <p className="mt-0.5 text-slate-700">{effectiveHoverTooltip.referenceLabel}</p>
              ) : (
                <>
                  <p className="mt-0.5 text-slate-700">Baseline: {effectiveHoverTooltip.baselineValueLabel ?? "--"}</p>
                  {effectiveHoverTooltip.errorPercentLabel ? <p className="text-slate-700">Error: {effectiveHoverTooltip.errorPercentLabel}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </ChartMountGuard>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 report-section">
        <p className="font-semibold text-slate-900">比較樣本說明（圖例）</p>
        <p className="mt-1 text-sm text-slate-700">每條線代表一個比較樣本 Sample 1 / Sample 2 / Sample 3…</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {rows.map((row, index) => {
            const isVisible = resolvedVisibleByTargetId[row.targetId] ?? true;
            return (
            <div
              key={`legend-${row.targetId}`}
              className={`rounded-md border border-slate-200 bg-white p-2.5 transition-opacity ${
                isVisible ? "opacity-100" : "opacity-45"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorByTargetId[row.targetId] ?? getSeriesColor(index) }}
                />
                <p className="font-semibold text-slate-900">
                  {isBaselineRow(row.targetId) ? `Baseline (${row.targetCode})` : row.targetCode}｜{row.datasetName}
                </p>
              </div>
              <p className="mt-1 text-slate-700">
                {row.conditionLabel}｜{row.sourceLabel}｜records: {row.recordCount}
              </p>
              <p className="mt-1 text-slate-700">
                FREQ: {formatFrequencyByMode(row.freqHz, settings.displayMode)}｜LEVEL: {formatLevelByMode(row.level, settings.displayMode)}
              </p>
              <p className="mt-1 text-slate-700">
                Rp: {formatResistanceByMode(row.values.rp, settings.displayMode)}｜Cp: {formatCapacitanceByMode(row.values.cp, settings.displayMode)}
              </p>
              <p className="text-slate-700">
                Rs: {formatResistanceByMode(row.values.rs, settings.displayMode)}｜Cs: {formatCapacitanceByMode(row.values.cs, settings.displayMode)}
              </p>
            </div>
          )})}
        </div>
      </div>

      {baselineRow ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">誤差比較（相對 Baseline）</p>
          <div className="mt-2 overflow-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-[560px] text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">對象</th>
                  <th className="px-3 py-2 text-left font-semibold">Rp</th>
                  <th className="px-3 py-2 text-left font-semibold">Cp</th>
                  <th className="px-3 py-2 text-left font-semibold">Rs</th>
                  <th className="px-3 py-2 text-left font-semibold">Cs</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => !isBaselineRow(row.targetId))
                  .map((row) => {
                    const isVisible = resolvedVisibleByTargetId[row.targetId] ?? true;
                    return (
                      <tr key={`error-row-${row.targetId}`} className={isVisible ? "opacity-100" : "opacity-45"}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.targetCode}</td>
                        <td className="px-3 py-2 font-mono">{formatErrorPercent(calculateErrorPercent(row.values.rp, baselineValues?.rp ?? null))}</td>
                        <td className="px-3 py-2 font-mono">{formatErrorPercent(calculateErrorPercent(row.values.cp, baselineValues?.cp ?? null))}</td>
                        <td className="px-3 py-2 font-mono">{formatErrorPercent(calculateErrorPercent(row.values.rs, baselineValues?.rs ?? null))}</td>
                        <td className="px-3 py-2 font-mono">{formatErrorPercent(calculateErrorPercent(row.values.cs, baselineValues?.cs ?? null))}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
