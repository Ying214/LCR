"use client";

import { useEffect, useState } from "react";

import type { UpdateMeasurementRecordPayload } from "@/lib/api-types";
import type { CapacitanceUnit, FrequencyUnit, MeasurementRecord, ResistanceUnit } from "@/lib/types";
import {
  CAPACITANCE_UNIT_OPTIONS,
  FREQUENCY_UNIT_OPTIONS,
  RESISTANCE_UNIT_OPTIONS,
  capacitanceToFarad,
  frequencyToHz,
  resistanceToOhm,
  toEditableCapacitance,
  toEditableFrequency,
  toEditableResistance,
} from "@/lib/unit-conversion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MeasurementRecordEditModalProps = {
  datasetId: string | null;
  record: MeasurementRecord | null;
  onClose: () => void;
  onSaved: (datasetId: string) => Promise<void> | void;
};

function toInputValue(value: number): string {
  return Number(value.toPrecision(12)).toString();
}

function parseNonNegative(rawValue: string, label: string): number | null {
  const parsed = Number(rawValue.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    alert(`${label} 必須為大於或等於 0 的數值。`);
    return null;
  }
  return parsed;
}

export function MeasurementRecordEditModal({
  datasetId,
  record,
  onClose,
  onSaved,
}: MeasurementRecordEditModalProps) {
  const [freqValue, setFreqValue] = useState("");
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>("khz");
  const [level, setLevel] = useState("");
  const [rpValue, setRpValue] = useState("");
  const [rpUnit, setRpUnit] = useState<ResistanceUnit>("ohm");
  const [cpValue, setCpValue] = useState("");
  const [cpUnit, setCpUnit] = useState<CapacitanceUnit>("nf");
  const [rsValue, setRsValue] = useState("");
  const [rsUnit, setRsUnit] = useState<ResistanceUnit>("ohm");
  const [csValue, setCsValue] = useState("");
  const [csUnit, setCsUnit] = useState<CapacitanceUnit>("nf");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) {
      return;
    }
    const editableFreq = toEditableFrequency(record.freqHz);
    const editableRp = toEditableResistance(record.rp);
    const editableCp = toEditableCapacitance(record.cp);
    const editableRs = toEditableResistance(record.rs);
    const editableCs = toEditableCapacitance(record.cs);

    setFreqValue(toInputValue(editableFreq.value));
    setFreqUnit(editableFreq.unit);
    setLevel(toInputValue(record.level));
    setRpValue(toInputValue(editableRp.value));
    setRpUnit(editableRp.unit);
    setCpValue(toInputValue(editableCp.value));
    setCpUnit(editableCp.unit);
    setRsValue(toInputValue(editableRs.value));
    setRsUnit(editableRs.unit);
    setCsValue(toInputValue(editableCs.value));
    setCsUnit(editableCs.unit);
  }, [record]);

  if (!record || !datasetId) {
    return null;
  }

  const save = async () => {
    const parsedFreq = parseNonNegative(freqValue, "FREQ");
    if (parsedFreq === null) {
      return;
    }
    const parsedLevel = parseNonNegative(level, "LEVEL");
    if (parsedLevel === null) {
      return;
    }
    const parsedRp = parseNonNegative(rpValue, "Rp");
    if (parsedRp === null) {
      return;
    }
    const parsedCp = parseNonNegative(cpValue, "Cp");
    if (parsedCp === null) {
      return;
    }
    const parsedRs = parseNonNegative(rsValue, "Rs");
    if (parsedRs === null) {
      return;
    }
    const parsedCs = parseNonNegative(csValue, "Cs");
    if (parsedCs === null) {
      return;
    }

    const payload: UpdateMeasurementRecordPayload = {
      freqHz: frequencyToHz(parsedFreq, freqUnit),
      level: parsedLevel,
      rp: resistanceToOhm(parsedRp, rpUnit),
      cp: capacitanceToFarad(parsedCp, cpUnit),
      rs: resistanceToOhm(parsedRs, rsUnit),
      cs: capacitanceToFarad(parsedCs, csUnit),
    };

    setSaving(true);
    try {
      const response = await fetch(`/api/measurements/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        alert(error.message ?? "更新 record 失敗。");
        return;
      }

      await onSaved(datasetId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">編輯量測明細</h3>
          <p className="text-xs text-slate-500">第 {record.indexNo} 筆，儲存時將轉回標準單位（Hz / Ω / F）。</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <UnitValueInput
            label="FREQ"
            value={freqValue}
            unit={freqUnit}
            options={FREQUENCY_UNIT_OPTIONS}
            onValueChange={setFreqValue}
            onUnitChange={(value) => setFreqUnit(value as FrequencyUnit)}
          />
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">LEVEL (V)</p>
            <Input type="text" inputMode="decimal" value={level} onChange={(event) => setLevel(event.target.value)} />
          </div>
          <UnitValueInput
            label="Rp"
            value={rpValue}
            unit={rpUnit}
            options={RESISTANCE_UNIT_OPTIONS}
            onValueChange={setRpValue}
            onUnitChange={(value) => setRpUnit(value as ResistanceUnit)}
          />
          <UnitValueInput
            label="Cp"
            value={cpValue}
            unit={cpUnit}
            options={CAPACITANCE_UNIT_OPTIONS}
            onValueChange={setCpValue}
            onUnitChange={(value) => setCpUnit(value as CapacitanceUnit)}
          />
          <UnitValueInput
            label="Rs"
            value={rsValue}
            unit={rsUnit}
            options={RESISTANCE_UNIT_OPTIONS}
            onValueChange={setRsValue}
            onUnitChange={(value) => setRsUnit(value as ResistanceUnit)}
          />
          <UnitValueInput
            label="Cs"
            value={csValue}
            unit={csUnit}
            options={CAPACITANCE_UNIT_OPTIONS}
            onValueChange={setCsValue}
            onUnitChange={(value) => setCsUnit(value as CapacitanceUnit)}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type UnitOption<T extends string> = { value: T; label: string };

type UnitValueInputProps<T extends string> = {
  label: string;
  value: string;
  unit: T;
  options: Array<UnitOption<T>>;
  onValueChange: (value: string) => void;
  onUnitChange: (value: string) => void;
};

function UnitValueInput<T extends string>({
  label,
  value,
  unit,
  options,
  onValueChange,
  onUnitChange,
}: UnitValueInputProps<T>) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
        <Input type="text" inputMode="decimal" value={value} onChange={(event) => onValueChange(event.target.value)} />
        <Select value={unit} onValueChange={onUnitChange}>
          <SelectTrigger className="w-[92px]">
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
    </div>
  );
}

