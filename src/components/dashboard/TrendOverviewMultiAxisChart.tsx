"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PARAMETER_LABELS } from "@/lib/constants";
import { buildTrendSeries } from "@/lib/calculations";
import { formatNumber } from "@/lib/formatters";
import { formatCapacitance, formatResistance } from "@/lib/unit-conversion";
import type {
  MeasurementDatasetWithRelations,
  ParameterKey,
  TrendRecordSelection,
} from "@/lib/types";

type TrendOverviewMultiAxisChartProps = {
  dataset: MeasurementDatasetWithRelations;
  showAverage: boolean;
  showBaseline: boolean;
  selectedTrialIndexes: number[];
  selectedRecord: TrendRecordSelection | null;
  onSelectRecord: (record: TrendRecordSelection | null) => void;
};

type DisplayUnit = {
  label: string;
  factor: number;
};

type AxisScale = {
  min: number;
  max: number;
  ticks: number[];
  toY: (value: number) => number;
  unit: DisplayUnit;
};

const AXIS_ORDER: ParameterKey[] = ["rp", "cp", "rs", "cs"];
const CHART_HEIGHT = 500;
const LEFT_MARGIN = 152;
const RIGHT_MARGIN = 132;
const TOP_MARGIN = 66;
const BOTTOM_MARGIN = 62;
const MIN_CHART_WIDTH = 760;

function getTicks(min: number, max: number, count = 5): number[] {
  if (count <= 1) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function getResistanceUnit(maxAbs: number): DisplayUnit {
  if (maxAbs >= 1e6) {
    return { label: "MΩ", factor: 1e6 };
  }
  if (maxAbs >= 1e3) {
    return { label: "kΩ", factor: 1e3 };
  }
  return { label: "Ω", factor: 1 };
}

function getCapacitanceUnit(maxAbs: number): DisplayUnit {
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

function getUnit(parameter: ParameterKey, maxAbs: number): DisplayUnit {
  return parameter === "rp" || parameter === "rs"
    ? getResistanceUnit(maxAbs)
    : getCapacitanceUnit(maxAbs);
}

function buildAxisScale(
  values: number[],
  top: number,
  height: number,
  unit: DisplayUnit,
): AxisScale {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;

  const padding = rawSpan === 0 ? Math.max(Math.abs(rawMax) * 0.08, 1e-12) : rawSpan * 0.08;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const span = max - min;

  return {
    min,
    max,
    ticks: getTicks(min, max, 5),
    unit,
    toY: (value: number) => {
      const ratio = (value - min) / span;
      return top + (1 - ratio) * height;
    },
  };
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TrendOverviewMultiAxisChart({
  dataset,
  showAverage,
  showBaseline,
  selectedTrialIndexes,
  selectedRecord,
  onSelectRecord,
}: TrendOverviewMultiAxisChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(MIN_CHART_WIDTH);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.floor(entries[0]?.contentRect.width ?? MIN_CHART_WIDTH);
      setContainerWidth(Math.max(MIN_CHART_WIDTH, nextWidth));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => buildTrendSeries(dataset), [dataset]);
  const selectedIndexNo =
    selectedRecord?.datasetId === dataset.id ? selectedRecord.indexNo : null;
  const visibleIndexSet = useMemo(
    () => (selectedTrialIndexes.length === 0 ? null : new Set(selectedTrialIndexes)),
    [selectedTrialIndexes],
  );

  const drawing = useMemo(() => {
    const width = Math.max(MIN_CHART_WIDTH, containerWidth);
    const plotWidth = width - LEFT_MARGIN - RIGHT_MARGIN;
    const plotHeight = CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
    const xStep = AXIS_ORDER.length > 1 ? plotWidth / (AXIS_ORDER.length - 1) : 0;

    const xByParameter: Record<ParameterKey, number> = {
      rp: LEFT_MARGIN,
      cp: LEFT_MARGIN + xStep,
      rs: LEFT_MARGIN + xStep * 2,
      cs: LEFT_MARGIN + xStep * 3,
    };

    const average = data[0]
      ? {
          rp: data[0].avgRp,
          cp: data[0].avgCp,
          rs: data[0].avgRs,
          cs: data[0].avgCs,
        }
      : null;
    const baseline = data[0]
      ? {
          rp: data[0].baselineRp,
          cp: data[0].baselineCp,
          rs: data[0].baselineRs,
          cs: data[0].baselineCs,
        }
      : null;

    const scales = AXIS_ORDER.reduce<Record<ParameterKey, AxisScale>>((acc, parameter) => {
      const values = data
        .map((point) => point[parameter])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (average) {
        values.push(average[parameter]);
      }
      const baselineValue = baseline?.[parameter] ?? null;
      if (isFiniteNumber(baselineValue)) {
        values.push(baselineValue);
      }
      if (values.length === 0) {
        values.push(0);
      }
      const maxAbs = Math.max(...values.map((value) => Math.abs(value)));
      const unit = getUnit(parameter, maxAbs);
      acc[parameter] = buildAxisScale(values, TOP_MARGIN, plotHeight, unit);
      return acc;
    }, {} as Record<ParameterKey, AxisScale>);

    return {
      width,
      plotHeight,
      xByParameter,
      scales,
      average,
      baseline,
    };
  }, [containerWidth, data]);

  const trialLines = useMemo(
    () =>
      data
        .map((point) => {
        const allFinite = AXIS_ORDER.every((parameter) => isFiniteNumber(point[parameter]));
        if (!allFinite) {
          return null;
        }
        const visible = visibleIndexSet === null || visibleIndexSet.has(point.indexNo);
        const points = AXIS_ORDER.map((parameter) => {
          const x = drawing.xByParameter[parameter];
          const y = drawing.scales[parameter].toY(point[parameter] as number);
          return `${x},${y}`;
        }).join(" ");
        const circles = AXIS_ORDER.map((parameter) => ({
          parameter,
          x: drawing.xByParameter[parameter],
          y: drawing.scales[parameter].toY(point[parameter] as number),
        }));
        return { point, points, circles, visible };
      })
        .filter((line): line is { point: (typeof data)[number]; points: string; circles: Array<{ parameter: ParameterKey; x: number; y: number }>; visible: boolean } => line !== null),
    [data, drawing, visibleIndexSet],
  );

  const averagePolyline = useMemo(() => {
    const average = drawing.average;
    if (!average) {
      return null;
    }
    return AXIS_ORDER.map((parameter) => {
      const x = drawing.xByParameter[parameter];
      const y = drawing.scales[parameter].toY(average[parameter]);
      return `${x},${y}`;
    }).join(" ");
  }, [drawing]);

  const baselinePolyline = useMemo(() => {
    if (!drawing.baseline) {
      return null;
    }

    const values = AXIS_ORDER.map((parameter) => drawing.baseline?.[parameter] ?? null);
    if (!values.every((value) => isFiniteNumber(value))) {
      return null;
    }

    return AXIS_ORDER.map((parameter) => {
      const baselineValue = drawing.baseline?.[parameter] ?? null;
      const x = drawing.xByParameter[parameter];
      const y = drawing.scales[parameter].toY(baselineValue as number);
      return `${x},${y}`;
    }).join(" ");
  }, [drawing]);
  const hasBaselineLine = baselinePolyline !== null;

  const handleSelect = (indexNo: number) => {
    if (selectedIndexNo === indexNo) {
      onSelectRecord(null);
      return;
    }
    onSelectRecord({ datasetId: dataset.id, indexNo });
  };

  const selectedPoint =
    selectedIndexNo === null ? null : data.find((point) => point.indexNo === selectedIndexNo) ?? null;
  const selectedTooltip = useMemo(() => {
    if (!selectedPoint) {
      return null;
    }

    const anchorX = drawing.xByParameter.rp;
    if (!isFiniteNumber(selectedPoint.rp)) {
      return null;
    }
    const anchorY = drawing.scales.rp.toY(selectedPoint.rp);
    const cardWidth = 246;
    const cardHeight = 136;
    const cardX = clamp(anchorX + 16, 16, drawing.width - cardWidth - 16);
    const cardY = clamp(anchorY - cardHeight / 2, TOP_MARGIN + 8, CHART_HEIGHT - BOTTOM_MARGIN - cardHeight - 8);

    return {
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      anchorX,
      anchorY,
    };
  }, [drawing.scales.rp, drawing.width, drawing.xByParameter.rp, selectedPoint]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-7 rounded bg-blue-300/70" />
          單筆量測（細線）
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[5px] w-7 rounded bg-slate-100" />
          平均值（粗線）
        </span>
        {hasBaselineLine ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-[2px] w-7 rounded border-t-2 border-dashed border-rose-500" />
            Baseline（虛線）
          </span>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="rounded-md border border-slate-200 bg-slate-950/95 px-3 py-2 shadow-inner"
      >
        <svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${drawing.width} ${CHART_HEIGHT}`}
          className="block"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={drawing.width} height={CHART_HEIGHT} fill="transparent" />

          {trialLines
            .filter((line) => line.visible)
            .map(({ point, points, circles }) => {
                const selected = selectedIndexNo === point.indexNo;
                const dimmed = selectedIndexNo !== null && !selected;
                return (
                  <g key={point.indexNo}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={selected ? "#93c5fd" : "#60a5fa"}
                      strokeWidth={selected ? 3.4 : 1.6}
                      strokeOpacity={selected ? 1 : dimmed ? 0.16 : 0.42}
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      className="cursor-pointer"
                      onClick={() => handleSelect(point.indexNo)}
                    />
                    {circles.map((circle) => (
                      <circle
                        key={`${point.indexNo}-${circle.parameter}`}
                        cx={circle.x}
                        cy={circle.y}
                        r={selected ? 4.2 : 2.8}
                        fill={selected ? "#dbeafe" : "#93c5fd"}
                        fillOpacity={selected ? 1 : dimmed ? 0.22 : 0.72}
                        stroke={selected ? "#60a5fa" : "transparent"}
                        strokeWidth={selected ? 1.8 : 0}
                      />
                    ))}
                  </g>
                );
              })}

          {showBaseline && baselinePolyline ? (
            <polyline
              points={baselinePolyline}
              fill="none"
              stroke="#fb7185"
              strokeWidth={2.2}
              strokeDasharray="9 6"
              strokeOpacity={0.9}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {showAverage && averagePolyline ? (
            <polyline
              points={averagePolyline}
              fill="none"
              stroke="#dbeafe"
              strokeWidth={5}
              strokeOpacity={1}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {AXIS_ORDER.map((parameter) => {
            const x = drawing.xByParameter[parameter];
            const axisScale = drawing.scales[parameter];
            const isLast = parameter === "cs";
            const averageValue = drawing.average?.[parameter] ?? null;
            const averageY = averageValue !== null ? axisScale.toY(averageValue) : null;
            const titleY = 30;
            const avgLabelY =
              averageY === null ? 0 : Math.max(TOP_MARGIN + 16, averageY - 12);
            return (
              <g key={parameter}>
                <line
                  x1={x}
                  x2={x}
                  y1={TOP_MARGIN}
                  y2={TOP_MARGIN + drawing.plotHeight}
                  stroke="#cbd5e1"
                  strokeWidth={1.2}
                />

                {axisScale.ticks.map((tick) => (
                  <g key={`${parameter}-${tick}`}>
                    <line
                      x1={x - 4}
                      x2={x + 4}
                      y1={axisScale.toY(tick)}
                      y2={axisScale.toY(tick)}
                      stroke="#94a3b8"
                      strokeWidth={1}
                    />
                    <text
                      x={x - 12}
                      y={axisScale.toY(tick) + 4}
                      textAnchor="end"
                      fontSize={13}
                      fill="#e2e8f0"
                    >
                      {formatNumber(tick / axisScale.unit.factor, 4)}
                    </text>
                  </g>
                ))}

                <text
                  x={x}
                  y={titleY}
                  textAnchor="middle"
                  fontSize={17}
                  fontWeight={700}
                  fill="#f8fafc"
                >
                  {PARAMETER_LABELS[parameter]} ({axisScale.unit.label})
                </text>

                {showAverage && averageValue !== null && averageY !== null ? (
                  <>
                    <circle
                      cx={x}
                      cy={averageY}
                      r={5.8}
                      fill="#0b1220"
                      stroke="#dbeafe"
                      strokeWidth={2.4}
                    />
                    <text
                      x={isLast ? x - 14 : x + 14}
                      y={avgLabelY}
                      textAnchor={isLast ? "end" : "start"}
                      fontSize={14}
                      fontWeight={700}
                      fill="#f8fafc"
                    >
                      {formatNumber(averageValue / axisScale.unit.factor, 4)} {axisScale.unit.label}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}

          {selectedPoint && selectedTooltip ? (
            <g>
              <line
                x1={selectedTooltip.anchorX}
                y1={selectedTooltip.anchorY}
                x2={selectedTooltip.cardX}
                y2={selectedTooltip.cardY + 22}
                stroke="#94a3b8"
                strokeOpacity={0.7}
                strokeWidth={1.1}
                strokeDasharray="3 3"
              />
              <rect
                x={selectedTooltip.cardX}
                y={selectedTooltip.cardY}
                width={selectedTooltip.cardWidth}
                height={selectedTooltip.cardHeight}
                rx={10}
                ry={10}
                fill="#f8fafc"
                fillOpacity={0.96}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              <text
                x={selectedTooltip.cardX + 14}
                y={selectedTooltip.cardY + 24}
                fontSize={18}
                fontWeight={700}
                fill="#0f172a"
              >
                第 {selectedPoint.indexNo} 筆
              </text>
              <text x={selectedTooltip.cardX + 14} y={selectedTooltip.cardY + 50} fontSize={16} fill="#1e293b">
                Rp: {formatResistance(selectedPoint.rp)}
              </text>
              <text x={selectedTooltip.cardX + 14} y={selectedTooltip.cardY + 72} fontSize={16} fill="#1e293b">
                Cp: {formatCapacitance(selectedPoint.cp)}
              </text>
              <text x={selectedTooltip.cardX + 14} y={selectedTooltip.cardY + 94} fontSize={16} fill="#1e293b">
                Rs: {formatResistance(selectedPoint.rs)}
              </text>
              <text x={selectedTooltip.cardX + 14} y={selectedTooltip.cardY + 116} fontSize={16} fill="#1e293b">
                Cs: {formatCapacitance(selectedPoint.cs)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
