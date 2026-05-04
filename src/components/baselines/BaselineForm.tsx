"use client";

import { useState } from "react";

import type { CreateBaselinePayload, OcrServiceResponse } from "@/lib/api-types";
import { extractMeasurementRecordsFromOcr } from "@/lib/ocr-parser";
import type { CapacitanceUnit, FrequencyUnit, ResistanceUnit } from "@/lib/types";
import {
  CAPACITANCE_UNIT_OPTIONS,
  FREQUENCY_UNIT_OPTIONS,
  RESISTANCE_UNIT_OPTIONS,
  capacitanceToFarad,
  frequencyToHz,
  resistanceToOhm,
} from "@/lib/unit-conversion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type BaselineFormValue = {
  name: string;
  conditionLabel: string;
  freqHz: string;
  freqUnit: FrequencyUnit;
  level: string;
  rp: string;
  rpUnit: ResistanceUnit;
  cp: string;
  cpUnit: CapacitanceUnit;
  rs: string;
  rsUnit: ResistanceUnit;
  cs: string;
  csUnit: CapacitanceUnit;
  note: string;
};

type BaselineFormProps = {
  initialValue?: BaselineFormValue;
  submitLabel: string;
  enableOcrImport?: boolean;
  onSubmit: (payload: CreateBaselinePayload) => Promise<void>;
};

const defaultValue: BaselineFormValue = {
  name: "",
  conditionLabel: "",
  freqHz: "",
  freqUnit: "khz",
  level: "",
  rp: "",
  rpUnit: "ohm",
  cp: "",
  cpUnit: "f",
  rs: "",
  rsUnit: "ohm",
  cs: "",
  csUnit: "f",
  note: "",
};

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function selectBestOcrRow(ocrResponse: OcrServiceResponse) {
  const rows = extractMeasurementRecordsFromOcr(ocrResponse);
  if (rows.length === 0) {
    return null;
  }

  return (
    rows.find(
      (row) =>
        row.freqHz.trim() &&
        row.level.trim() &&
        row.rp.trim() &&
        row.cp.trim() &&
        row.rs.trim() &&
        row.cs.trim(),
    ) ?? rows[0]
  );
}

export function BaselineForm({
  initialValue = defaultValue,
  submitLabel,
  enableOcrImport = false,
  onSubmit,
}: BaselineFormProps) {
  const [value, setValue] = useState<BaselineFormValue>(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const importFromImage = async () => {
    if (!selectedFile) {
      alert("請先選擇圖片檔案。");
      return;
    }

    setIsImporting(true);
    setImportMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json().catch(() => null)) as OcrServiceResponse | { message?: string } | null;
      if (!response.ok) {
        alert((json as { message?: string } | null)?.message ?? "OCR 辨識失敗。");
        return;
      }

      const picked = selectBestOcrRow(json as OcrServiceResponse);
      if (!picked) {
        alert("OCR 完成，但沒有可預填的 baseline 數值。");
        return;
      }

      setValue((prev) => ({
        ...prev,
        freqHz: picked.freqHz,
        freqUnit: picked.freqUnit,
        level: picked.level,
        rp: picked.rp,
        rpUnit: picked.rpUnit,
        cp: picked.cp,
        cpUnit: picked.cpUnit,
        rs: picked.rs,
        rsUnit: picked.rsUnit,
        cs: picked.cs,
        csUnit: picked.csUnit,
      }));
      setImportMessage("已由 OCR 預填 baseline 欄位，請確認後可手動修正。");
    } catch {
      alert("無法呼叫 OCR API，請確認 OCR service 是否已啟動。");
    } finally {
      setIsImporting(false);
    }
  };

  const submit = async () => {
    // TODO: 下輪改為 toast 提示，取代 alert。
    if (!value.name.trim()) {
      alert("Baseline 名稱為必填。");
      return;
    }

    setIsSubmitting(true);
    try {
      const freqHzValue = toOptionalNumber(value.freqHz);
      const levelValue = toOptionalNumber(value.level);
      const rpValue = toOptionalNumber(value.rp);
      const cpValue = toOptionalNumber(value.cp);
      const rsValue = toOptionalNumber(value.rs);
      const csValue = toOptionalNumber(value.cs);

      await onSubmit({
        name: value.name.trim(),
        conditionLabel: value.conditionLabel.trim() || undefined,
        note: value.note.trim() || undefined,
        freqHz:
          freqHzValue === undefined ? undefined : frequencyToHz(freqHzValue, value.freqUnit),
        level: levelValue,
        rp: rpValue === undefined ? undefined : resistanceToOhm(rpValue, value.rpUnit),
        cp: cpValue === undefined ? undefined : capacitanceToFarad(cpValue, value.cpUnit),
        rs: rsValue === undefined ? undefined : resistanceToOhm(rsValue, value.rsUnit),
        cs: csValue === undefined ? undefined : capacitanceToFarad(csValue, value.csUnit),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {enableOcrImport ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">圖片上傳匯入（可選）</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="baseline-ocr-file">LCR 圖片</Label>
              <Input
                id="baseline-ocr-file"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" onClick={() => void importFromImage()} disabled={!selectedFile || isImporting}>
              {isImporting ? "匯入中..." : "由圖片預填欄位"}
            </Button>
          </div>
          {importMessage ? <p className="mt-2 text-xs text-emerald-700">{importMessage}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Baseline 名稱</Label>
          <Input
            id="name"
            value={value.name}
            onChange={(event) => setValue({ ...value, name: event.target.value })}
            placeholder="例如：基準 A"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conditionLabel">製程條件</Label>
          <Input
            id="conditionLabel"
            value={value.conditionLabel}
            onChange={(event) => setValue({ ...value, conditionLabel: event.target.value })}
            placeholder="例如：未製程前"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="freqHz">FREQ(Hz)</Label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input
              id="freqHz"
              type="number"
              value={value.freqHz}
              onChange={(event) => setValue({ ...value, freqHz: event.target.value })}
            />
            <Select value={value.freqUnit} onValueChange={(next) => setValue({ ...value, freqUnit: next as FrequencyUnit })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="level">LEVEL</Label>
          <Input
            id="level"
            type="number"
            value={value.level}
            onChange={(event) => setValue({ ...value, level: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp">Rp</Label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input
              id="rp"
              type="number"
              value={value.rp}
              onChange={(event) => setValue({ ...value, rp: event.target.value })}
            />
            <Select value={value.rpUnit} onValueChange={(next) => setValue({ ...value, rpUnit: next as ResistanceUnit })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESISTANCE_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp">Cp</Label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input
              id="cp"
              type="number"
              value={value.cp}
              onChange={(event) => setValue({ ...value, cp: event.target.value })}
            />
            <Select value={value.cpUnit} onValueChange={(next) => setValue({ ...value, cpUnit: next as CapacitanceUnit })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPACITANCE_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rs">Rs</Label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input
              id="rs"
              type="number"
              value={value.rs}
              onChange={(event) => setValue({ ...value, rs: event.target.value })}
            />
            <Select value={value.rsUnit} onValueChange={(next) => setValue({ ...value, rsUnit: next as ResistanceUnit })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESISTANCE_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs">Cs</Label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input
              id="cs"
              type="number"
              value={value.cs}
              onChange={(event) => setValue({ ...value, cs: event.target.value })}
            />
            <Select value={value.csUnit} onValueChange={(next) => setValue({ ...value, csUnit: next as CapacitanceUnit })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPACITANCE_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            value={value.note}
            onChange={(event) => setValue({ ...value, note: event.target.value })}
          />
        </div>
      </div>
      <Button type="button" onClick={submit} disabled={isSubmitting}>
        {isSubmitting ? "儲存中..." : submitLabel}
      </Button>
    </div>
  );
}
