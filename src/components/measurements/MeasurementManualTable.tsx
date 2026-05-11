"use client";

import { useMemo, useState } from "react";

import { calculateAverages } from "@/lib/calculations";
import type { MeasurementUnitFields } from "@/lib/types";
import {
  CAPACITANCE_UNIT_OPTIONS,
  FREQUENCY_UNIT_OPTIONS,
  RESISTANCE_UNIT_OPTIONS,
  capacitanceToFarad,
  formatCapacitance,
  formatResistance,
  resistanceToOhm,
} from "@/lib/unit-conversion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ManualMeasurementRow = {
  rowId: string;
  freqHz: string;
  level: string;
  rp: string;
  cp: string;
  rs: string;
  cs: string;
  fromOcr?: boolean;
  freqScore?: number | null;
  levelScore?: number | null;
  rpScore?: number | null;
  cpScore?: number | null;
  rsScore?: number | null;
  csScore?: number | null;
} & MeasurementUnitFields;

type MeasurementManualTableProps = {
  rows: ManualMeasurementRow[];
  onRowsChange: (rows: ManualMeasurementRow[]) => void;
};

type NumericField = "freqHz" | "level" | "rp" | "cp" | "rs" | "cs";
type UnitField = "freqUnit" | "rpUnit" | "cpUnit" | "rsUnit" | "csUnit";
type ColumnUnitDefaults = Pick<ManualMeasurementRow, UnitField>;

const DEFAULT_COLUMN_UNITS: ColumnUnitDefaults = {
  freqUnit: "khz",
  rpUnit: "kohm",
  cpUnit: "nf",
  rsUnit: "ohm",
  csUnit: "nf",
};
const LOW_SCORE_THRESHOLD = 0.8;

function createEmptyRow(columnUnits: ColumnUnitDefaults): ManualMeasurementRow {
  return {
    rowId: `row-${Date.now()}-${Math.random()}`,
    freqHz: "10",
    level: "2",
    rp: "",
    cp: "",
    rs: "",
    cs: "",
    fromOcr: false,
    freqScore: null,
    levelScore: null,
    rpScore: null,
    cpScore: null,
    rsScore: null,
    csScore: null,
    ...columnUnits,
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function parseRequiredNonNegativeNumber(value: string): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }
  return parsed;
}

function getScoreText(value: string, score: number | null | undefined): string {
  if (!value.trim()) {
    return "缺少辨識值";
  }
  if (typeof score === "number") {
    return `信心度 ${score.toFixed(3)}`;
  }
  return "無信心度資料";
}

function getScoreHintClass(value: string, score: number | null | undefined): string {
  if (!value.trim()) {
    return "text-rose-700";
  }
  if (typeof score !== "number") {
    return "text-amber-700";
  }
  if (score < LOW_SCORE_THRESHOLD) {
    return "text-rose-700";
  }
  return "text-slate-500";
}

function getScoreInputClass(value: string, score: number | null | undefined): string {
  if (!value.trim()) {
    return "border-rose-300 bg-rose-50";
  }
  if (typeof score !== "number") {
    return "border-amber-300 bg-amber-50";
  }
  if (score < LOW_SCORE_THRESHOLD) {
    return "border-rose-300 bg-rose-50";
  }
  return "";
}

export function MeasurementManualTable({ rows, onRowsChange }: MeasurementManualTableProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(rows[0]?.rowId ?? null);
  const [showAverage, setShowAverage] = useState(false);
  const [batchFreqValue, setBatchFreqValue] = useState(rows[0]?.freqHz ?? "10");
  const [batchLevelValue, setBatchLevelValue] = useState(rows[0]?.level ?? "2");
  const [columnUnits, setColumnUnits] = useState<ColumnUnitDefaults>({
    freqUnit: rows[0]?.freqUnit ?? DEFAULT_COLUMN_UNITS.freqUnit,
    rpUnit: rows[0]?.rpUnit ?? DEFAULT_COLUMN_UNITS.rpUnit,
    cpUnit: rows[0]?.cpUnit ?? DEFAULT_COLUMN_UNITS.cpUnit,
    rsUnit: rows[0]?.rsUnit ?? DEFAULT_COLUMN_UNITS.rsUnit,
    csUnit: rows[0]?.csUnit ?? DEFAULT_COLUMN_UNITS.csUnit,
  });

  const averageSummary = useMemo(() => {
    const normalizedRows = rows
      .map((row) => {
        const rp = parseOptionalNumber(row.rp);
        const cp = parseOptionalNumber(row.cp);
        const rs = parseOptionalNumber(row.rs);
        const cs = parseOptionalNumber(row.cs);

        if (rp === null || cp === null || rs === null || cs === null) {
          return null;
        }

        return {
          rp: resistanceToOhm(rp, row.rpUnit),
          cp: capacitanceToFarad(cp, row.cpUnit),
          rs: resistanceToOhm(rs, row.rsUnit),
          cs: capacitanceToFarad(cs, row.csUnit),
        };
      })
      .filter((item): item is { rp: number; cp: number; rs: number; cs: number } => item !== null);

    if (normalizedRows.length === 0) {
      return { values: null, validCount: 0 };
    }

    return {
      values: calculateAverages(normalizedRows),
      validCount: normalizedRows.length,
    };
  }, [rows]);

  const updateNumericCell = (rowId: string, field: NumericField, value: string) => {
    onRowsChange(rows.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
  };

  const updateRowUnitCell = (
    rowId: string,
    field: UnitField,
    value: string,
  ) => {
    onRowsChange(
      rows.map((row) =>
        row.rowId === rowId
          ? { ...row, [field]: value as ManualMeasurementRow[typeof field] }
          : row,
      ),
    );
  };

  const updateColumnUnit = (field: UnitField, value: string) => {
    const typedValue = value as ManualMeasurementRow[typeof field];
    setColumnUnits((prev) => ({ ...prev, [field]: typedValue }));
  };

  const applyColumnUnitsToAllRows = () => {
    const parsedFreq = parseRequiredNonNegativeNumber(batchFreqValue);
    const parsedLevel = parseRequiredNonNegativeNumber(batchLevelValue);

    if (parsedFreq === null || parsedLevel === null) {
      // TODO: 下輪改為 toast 提示，取代 alert。
      alert("FREQ 與 LEVEL 批次數值必須填寫且不可小於 0。");
      return;
    }

    onRowsChange(
      rows.map((row) => ({
        ...row,
        ...columnUnits,
        freqHz: batchFreqValue.trim(),
        level: batchLevelValue.trim(),
      })),
    );
  };

  const addRow = () => {
    const nextRow = createEmptyRow(columnUnits);
    onRowsChange([...rows, nextRow]);
    setSelectedRowId(nextRow.rowId);
  };

  const removeRow = () => {
    if (!selectedRowId) {
      return;
    }
    const nextRows = rows.filter((row) => row.rowId !== selectedRowId);
    if (nextRows.length === 0) {
      const fallback = createEmptyRow(columnUnits);
      onRowsChange([fallback]);
      setSelectedRowId(fallback.rowId);
      return;
    }
    onRowsChange(nextRows);
    setSelectedRowId(nextRows[0].rowId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">批次預設單位</p>
            <p className="text-xs text-slate-500">
              設定單位與 FREQ/LEVEL 批次數值後，可按「套用到所有列」一次更新目前資料列。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={applyColumnUnitsToAllRows}>
            套用到所有列
          </Button>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <BatchUnitSelect
            label="FREQ 預設單位"
            value={columnUnits.freqUnit}
            options={FREQUENCY_UNIT_OPTIONS}
            onChange={(value) => updateColumnUnit("freqUnit", value)}
          />
          <BatchUnitSelect
            label="Rp 預設單位"
            value={columnUnits.rpUnit}
            options={RESISTANCE_UNIT_OPTIONS}
            onChange={(value) => updateColumnUnit("rpUnit", value)}
          />
          <BatchUnitSelect
            label="Cp 預設單位"
            value={columnUnits.cpUnit}
            options={CAPACITANCE_UNIT_OPTIONS}
            onChange={(value) => updateColumnUnit("cpUnit", value)}
          />
          <BatchUnitSelect
            label="Rs 預設單位"
            value={columnUnits.rsUnit}
            options={RESISTANCE_UNIT_OPTIONS}
            onChange={(value) => updateColumnUnit("rsUnit", value)}
          />
          <BatchUnitSelect
            label="Cs 預設單位"
            value={columnUnits.csUnit}
            options={CAPACITANCE_UNIT_OPTIONS}
            onChange={(value) => updateColumnUnit("csUnit", value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">FREQ 批次數值</p>
            <Input
              type="text"
              inputMode="decimal"
              className="h-8 font-mono"
              value={batchFreqValue}
              onChange={(event) => setBatchFreqValue(event.target.value)}
              placeholder="請輸入 FREQ"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">LEVEL 批次數值 (V)</p>
            <Input
              type="text"
              inputMode="decimal"
              className="h-8 font-mono"
              value={batchLevelValue}
              onChange={(event) => setBatchLevelValue(event.target.value)}
              placeholder="請輸入 LEVEL"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table className="table-fixed w-full min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">選取</TableHead>
              <TableHead className="w-12 text-center">筆數</TableHead>
              <TableHead className="w-[162px]">FREQ</TableHead>
              <TableHead className="w-[88px]">LEVEL (V)</TableHead>
              <TableHead className="w-[190px]">Rp</TableHead>
              <TableHead className="w-[190px]">Cp</TableHead>
              <TableHead className="w-[190px]">Rs</TableHead>
              <TableHead className="w-[190px]">Cs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.rowId} className={selectedRowId === row.rowId ? "bg-slate-100/70" : undefined}>
                <TableCell className="text-center">
                  <input
                    type="radio"
                    name="row-select"
                    checked={selectedRowId === row.rowId}
                    onChange={() => setSelectedRowId(row.rowId)}
                  />
                </TableCell>
                <TableCell className="w-12 text-center font-mono text-sm">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <UnitValueEditor
                    value={row.freqHz}
                    unit={row.freqUnit}
                    options={FREQUENCY_UNIT_OPTIONS}
                    unitWidthClass="w-[80px]"
                    score={row.freqScore}
                    showScoreHint={Boolean(row.fromOcr)}
                    onValueChange={(value) => updateNumericCell(row.rowId, "freqHz", value)}
                    onUnitChange={(value) => updateRowUnitCell(row.rowId, "freqUnit", value)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className={`h-8 font-mono ${row.fromOcr ? getScoreInputClass(row.level, row.levelScore) : ""}`}
                      value={row.level}
                      onChange={(event) => updateNumericCell(row.rowId, "level", event.target.value)}
                    />
                    {row.fromOcr ? (
                      <p className={`text-[11px] leading-none ${getScoreHintClass(row.level, row.levelScore)}`}>
                        {getScoreText(row.level, row.levelScore)}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <UnitValueEditor
                    value={row.rp}
                    unit={row.rpUnit}
                    options={RESISTANCE_UNIT_OPTIONS}
                    unitWidthClass="w-[84px]"
                    score={row.rpScore}
                    showScoreHint={Boolean(row.fromOcr)}
                    onValueChange={(value) => updateNumericCell(row.rowId, "rp", value)}
                    onUnitChange={(value) => updateRowUnitCell(row.rowId, "rpUnit", value)}
                  />
                </TableCell>
                <TableCell>
                  <UnitValueEditor
                    value={row.cp}
                    unit={row.cpUnit}
                    options={CAPACITANCE_UNIT_OPTIONS}
                    unitWidthClass="w-[84px]"
                    score={row.cpScore}
                    showScoreHint={Boolean(row.fromOcr)}
                    onValueChange={(value) => updateNumericCell(row.rowId, "cp", value)}
                    onUnitChange={(value) => updateRowUnitCell(row.rowId, "cpUnit", value)}
                  />
                </TableCell>
                <TableCell>
                  <UnitValueEditor
                    value={row.rs}
                    unit={row.rsUnit}
                    options={RESISTANCE_UNIT_OPTIONS}
                    unitWidthClass="w-[84px]"
                    score={row.rsScore}
                    showScoreHint={Boolean(row.fromOcr)}
                    onValueChange={(value) => updateNumericCell(row.rowId, "rs", value)}
                    onUnitChange={(value) => updateRowUnitCell(row.rowId, "rsUnit", value)}
                  />
                </TableCell>
                <TableCell>
                  <UnitValueEditor
                    value={row.cs}
                    unit={row.csUnit}
                    options={CAPACITANCE_UNIT_OPTIONS}
                    unitWidthClass="w-[84px]"
                    score={row.csScore}
                    showScoreHint={Boolean(row.fromOcr)}
                    onValueChange={(value) => updateNumericCell(row.rowId, "cs", value)}
                    onUnitChange={(value) => updateRowUnitCell(row.rowId, "csUnit", value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addRow}>
          新增一列
        </Button>
        <Button type="button" variant="secondary" onClick={removeRow} disabled={!selectedRowId}>
          刪除一列
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowAverage(true)}>
          計算平均
        </Button>
      </div>

      {showAverage ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 font-medium text-slate-700">
            平均值（前端即時計算，已轉換為標準單位：Ω / F）
          </p>
          {averageSummary.values ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <p className="font-mono">Rp: {formatResistance(averageSummary.values.rp)}</p>
                <p className="font-mono">Cp: {formatCapacitance(averageSummary.values.cp)}</p>
                <p className="font-mono">Rs: {formatResistance(averageSummary.values.rs)}</p>
                <p className="font-mono">Cs: {formatCapacitance(averageSummary.values.cs)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">有效列數：{averageSummary.validCount}</p>
            </>
          ) : (
            <p className="text-xs text-amber-700">
              請先填寫有效且非負的 Rp/Cp/Rs/Cs 數值後再計算平均。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function createInitialManualRows(): ManualMeasurementRow[] {
  return [createEmptyRow(DEFAULT_COLUMN_UNITS), createEmptyRow(DEFAULT_COLUMN_UNITS), createEmptyRow(DEFAULT_COLUMN_UNITS)];
}

type UnitOption<T extends string> = {
  value: T;
  label: string;
};

type BatchUnitSelectProps<T extends string> = {
  label: string;
  value: T;
  options: Array<UnitOption<T>>;
  onChange: (value: string) => void;
};

function BatchUnitSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: BatchUnitSelectProps<T>) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type UnitValueEditorProps<T extends string> = {
  value: string;
  unit: T;
  options: Array<UnitOption<T>>;
  unitWidthClass?: string;
  score?: number | null;
  showScoreHint?: boolean;
  onValueChange: (value: string) => void;
  onUnitChange: (value: string) => void;
};

function UnitValueEditor<T extends string>({
  value,
  unit,
  options,
  unitWidthClass = "w-[88px]",
  score,
  showScoreHint = false,
  onValueChange,
  onUnitChange,
}: UnitValueEditorProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          type="text"
          inputMode="decimal"
          className={`h-8 min-w-0 font-mono ${showScoreHint ? getScoreInputClass(value, score) : ""}`}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <Select value={unit} onValueChange={onUnitChange}>
          <SelectTrigger className={`h-8 ${unitWidthClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showScoreHint ? (
        <p className={`text-[11px] leading-none ${getScoreHintClass(value, score)}`}>
          {getScoreText(value, score)}
        </p>
      ) : null}
    </div>
  );
}
