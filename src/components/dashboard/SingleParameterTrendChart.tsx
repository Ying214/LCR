import { useMemo } from "react";
import {
  type TooltipContentProps,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PARAMETER_COLORS, PARAMETER_LABELS } from "@/lib/constants";
import { buildTrendSeries } from "@/lib/calculations";
import { formatNumber } from "@/lib/formatters";
import { formatCapacitance, formatResistance } from "@/lib/unit-conversion";
import type {
  MeasurementDatasetWithRelations,
  ParameterKey,
  TrendRecordSelection,
} from "@/lib/types";

import { ChartMountGuard } from "@/components/shared/ChartMountGuard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SingleParameterTrendChartProps = {
  dataset: MeasurementDatasetWithRelations;
  parameter: ParameterKey;
  onParameterChange: (parameter: ParameterKey) => void;
  showAverage: boolean;
  showBaseline: boolean;
  onShowAverageChange: (value: boolean) => void;
  onShowBaselineChange: (value: boolean) => void;
  selectedRecord: TrendRecordSelection | null;
  onSelectRecord: (record: TrendRecordSelection | null) => void;
};

type TrendSeriesLike = {
  datasetId: string;
  indexNo: number;
  rp: number;
  cp: number;
  rs: number;
  cs: number;
  avgRp: number;
  avgCp: number;
  avgRs: number;
  avgCs: number;
  baselineRp: number | null;
  baselineCp: number | null;
  baselineRs: number | null;
  baselineCs: number | null;
};

type DotRenderProps = {
  cx?: number;
  cy?: number;
  payload?: unknown;
};

function isTrendSeriesLike(value: unknown): value is TrendSeriesLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  const point = value as Record<string, unknown>;
  return (
    typeof point.datasetId === "string" &&
    typeof point.indexNo === "number" &&
    typeof point.rp === "number" &&
    typeof point.cp === "number" &&
    typeof point.rs === "number" &&
    typeof point.cs === "number"
  );
}

function toAverageKey(parameter: ParameterKey): "avgRp" | "avgCp" | "avgRs" | "avgCs" {
  if (parameter === "rp") {
    return "avgRp";
  }
  if (parameter === "cp") {
    return "avgCp";
  }
  if (parameter === "rs") {
    return "avgRs";
  }
  return "avgCs";
}

function toBaselineKey(
  parameter: ParameterKey,
): "baselineRp" | "baselineCp" | "baselineRs" | "baselineCs" {
  if (parameter === "rp") {
    return "baselineRp";
  }
  if (parameter === "cp") {
    return "baselineCp";
  }
  if (parameter === "rs") {
    return "baselineRs";
  }
  return "baselineCs";
}

type DisplayConfig = {
  label: string;
  factor: number;
};

function getResistanceDisplayConfig(maxAbs: number): DisplayConfig {
  if (maxAbs >= 1e6) {
    return { label: "MΩ", factor: 1e6 };
  }
  if (maxAbs >= 1e3) {
    return { label: "kΩ", factor: 1e3 };
  }
  return { label: "Ω", factor: 1 };
}

function getCapacitanceDisplayConfig(maxAbs: number): DisplayConfig {
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

function getDisplayConfig(parameter: ParameterKey, maxAbs: number): DisplayConfig {
  return parameter === "rp" || parameter === "rs"
    ? getResistanceDisplayConfig(maxAbs)
    : getCapacitanceDisplayConfig(maxAbs);
}

function formatParameterValue(parameter: ParameterKey, value: number | null): string {
  if (value === null) {
    return "--";
  }
  return parameter === "rp" || parameter === "rs"
    ? formatResistance(value)
    : formatCapacitance(value);
}

function formatDeltaValue(parameter: ParameterKey, value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  const formatted =
    parameter === "rp" || parameter === "rs" ? formatResistance(abs) : formatCapacitance(abs);
  return `${sign}${formatted}`;
}

function formatDeltaPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatNumber(Math.abs(value), 2)}%`;
}

function buildDeltaPercent(delta: number, reference: number | null): number | null {
  if (reference === null || reference === 0) {
    return null;
  }
  return (delta / reference) * 100;
}

export function SingleParameterTrendChart({
  dataset,
  parameter,
  onParameterChange,
  showAverage,
  showBaseline,
  onShowAverageChange,
  onShowBaselineChange,
  selectedRecord,
  onSelectRecord,
}: SingleParameterTrendChartProps) {
  const data = useMemo(() => buildTrendSeries(dataset), [dataset]);
  const averageKey = toAverageKey(parameter);
  const baselineKey = toBaselineKey(parameter);

  const selectedIndexNo =
    selectedRecord?.datasetId === dataset.id ? selectedRecord.indexNo : null;
  const selectedPoint =
    selectedIndexNo === null ? null : data.find((point) => point.indexNo === selectedIndexNo) ?? null;

  const yDomain = useMemo<[number, number]>(() => {
    const values = data.map((point) => point[parameter]);
    const averageValue = data[0]?.[averageKey];
    const baselineValue = data[0]?.[baselineKey] ?? null;

    if (Number.isFinite(averageValue)) {
      values.push(averageValue);
    }
    if (baselineValue !== null && Number.isFinite(baselineValue)) {
      values.push(baselineValue);
    }

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin;

    const padding = span === 0 ? Math.max(Math.abs(rawMax) * 0.08, 1e-12) : span * 0.08;
    return [rawMin - padding, rawMax + padding];
  }, [averageKey, baselineKey, data, parameter]);

  const displayConfig = useMemo(() => {
    const candidateValues: number[] = [...data.map((point) => point[parameter])];
    const averageValue = data[0]?.[averageKey];
    const baselineValue = data[0]?.[baselineKey] ?? null;

    if (Number.isFinite(averageValue)) {
      candidateValues.push(averageValue);
    }
    if (baselineValue !== null && Number.isFinite(baselineValue)) {
      candidateValues.push(baselineValue);
    }

    const maxAbs = Math.max(...candidateValues.map((value) => Math.abs(value)));
    return getDisplayConfig(parameter, maxAbs);
  }, [averageKey, baselineKey, data, parameter]);

  const selectIndex = (indexNo: number) => {
    if (selectedIndexNo === indexNo) {
      onSelectRecord(null);
      return;
    }
    onSelectRecord({ datasetId: dataset.id, indexNo });
  };

  const renderTrialDot =
    (color: string) => {
      const TrialDot = ({ cx, cy, payload }: DotRenderProps) => {
        if (cx === undefined || cy === undefined || !isTrendSeriesLike(payload)) {
          return null;
        }
        const active = selectedIndexNo === payload.indexNo;
        const dimmed = selectedIndexNo !== null && !active;
        return (
          <circle
            cx={cx}
            cy={cy}
            r={active ? 6 : 3}
            fill={color}
            stroke="white"
            strokeWidth={active ? 1.5 : 1}
            fillOpacity={dimmed ? 0.2 : 0.85}
            className="cursor-pointer"
            onClick={() => selectIndex(payload.indexNo)}
          />
        );
      };
      TrialDot.displayName = "SingleParameterTrialDot";
      return TrialDot;
    };

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        目前無趨勢資料可顯示。
      </div>
    );
  }

  const color = PARAMETER_COLORS[parameter];
  const parameterLabel = PARAMETER_LABELS[parameter];
  const baselineValue = data[0][baselineKey];
  const averageValue = data[0][averageKey];
  const trialOpacity = selectedIndexNo === null ? 0.45 : 0.2;

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0]?.payload as TrendSeriesLike & { trialValue: number | null };
    if (!point) {
      return null;
    }

    const currentValue = point[parameter];
    const avgValue = point[averageKey];
    const baseValue = point[baselineKey] ?? null;

    const deltaAvg = currentValue - avgValue;
    const deltaBase = baseValue === null ? null : currentValue - baseValue;
    const deltaAvgPercent = buildDeltaPercent(deltaAvg, avgValue);
    const deltaBasePercent = deltaBase === null ? null : buildDeltaPercent(deltaBase, baseValue);

    return (
      <div className="min-w-[210px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <p className="mb-2 font-semibold text-slate-900">第 {point.indexNo} 筆</p>
        <div className="space-y-1 text-slate-700">
          <p>
            {parameterLabel}:{" "}
            <span className="font-mono font-medium">{formatParameterValue(parameter, currentValue)}</span>
          </p>
          <p>
            AVG: <span className="font-mono font-medium">{formatParameterValue(parameter, avgValue)}</span>
          </p>
          <p>
            ΔAVG:{" "}
            <span className="font-mono font-medium">
              {formatDeltaValue(parameter, deltaAvg)} ({formatDeltaPercent(deltaAvgPercent)})
            </span>
          </p>
          <p>
            ΔBase:{" "}
            <span className="font-mono font-medium">
              {deltaBase === null
                ? "--"
                : `${formatDeltaValue(parameter, deltaBase)} (${formatDeltaPercent(deltaBasePercent)})`}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <Tabs value={parameter} onValueChange={(value) => onParameterChange(value as ParameterKey)}>
        <TabsList variant="default">
          <TabsTrigger value="rp">Rp</TabsTrigger>
          <TabsTrigger value="cp">Cp</TabsTrigger>
          <TabsTrigger value="rs">Rs</TabsTrigger>
          <TabsTrigger value="cs">Cs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-4 rounded-md border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showAverage} onCheckedChange={(checked) => onShowAverageChange(checked === true)} />
          <Label className="font-normal">顯示平均線</Label>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showBaseline} onCheckedChange={(checked) => onShowBaselineChange(checked === true)} />
          <Label className="font-normal">顯示 baseline 線</Label>
        </label>
      </div>

      <ChartMountGuard className="h-[420px] min-h-[420px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
          <LineChart data={data} margin={{ top: 18, right: 28, left: 28, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="indexNo" label={{ value: "筆數", position: "insideBottom", offset: -4 }} />
            <YAxis
              domain={yDomain}
              width={96}
              tickMargin={8}
              tickFormatter={(value) =>
                formatNumber(Number(value) / displayConfig.factor, 4)
              }
              label={{
                value: `${parameterLabel} (${displayConfig.label})`,
                angle: -90,
                position: "insideLeft",
                offset: 0,
                style: { textAnchor: "middle", fill: "#334155" },
              }}
            />
            <Tooltip content={renderTooltip} />

            <Line
              type="monotone"
              dataKey={parameter}
              stroke={color}
              strokeWidth={2}
              opacity={trialOpacity}
              dot={renderTrialDot(color)}
              name={`${parameterLabel} 單筆`}
            />

            {showAverage ? (
              <Line
                type="monotone"
                dataKey={averageKey}
                stroke={color}
                strokeWidth={3}
                strokeOpacity={0.95}
                dot={{
                  r: 4.4,
                  fill: color,
                  stroke: "white",
                  strokeWidth: 1.5,
                }}
                activeDot={false}
                name={`${parameterLabel} 平均`}
              />
            ) : null}

            {showBaseline && baselineValue !== null ? (
              <ReferenceLine
                y={baselineValue}
                stroke={color}
                strokeDasharray="6 4"
                strokeOpacity={0.9}
                label={{ value: "Baseline", position: "insideTopRight", fill: "#334155", fontSize: 12 }}
              />
            ) : null}

            {selectedIndexNo !== null ? (
              <ReferenceLine x={selectedIndexNo} stroke="#0f172a" strokeDasharray="3 3" />
            ) : null}

            {selectedPoint ? (
              <ReferenceDot
                x={selectedPoint.indexNo}
                y={selectedPoint[parameter]}
                r={7}
                fill={color}
                stroke="#0f172a"
                strokeWidth={2}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </ChartMountGuard>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600">
        <span>
          平均值: <strong>{formatParameterValue(parameter, averageValue)}</strong>
        </span>
        <span>
          Baseline: <strong>{formatParameterValue(parameter, baselineValue)}</strong>
        </span>
      </div>
    </div>
  );
}
