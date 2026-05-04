"use client";

import { useState } from "react";

import type { CreateMeasurementDatasetPayload } from "@/lib/api-types";
import { capacitanceToFarad, frequencyToHz, resistanceToOhm } from "@/lib/unit-conversion";

import { SectionCard } from "@/components/layout/SectionCard";
import {
  type MeasurementBasicInfo,
  MeasurementBasicInfoForm,
} from "@/components/measurements/MeasurementBasicInfoForm";
import { MeasurementImportPanel } from "@/components/measurements/MeasurementImportPanel";
import {
  createInitialManualRows,
  type ManualMeasurementRow,
  MeasurementManualTable,
} from "@/components/measurements/MeasurementManualTable";
import { MeasurementSaveActions } from "@/components/measurements/MeasurementSaveActions";

const initialBasicInfo: MeasurementBasicInfo = {
  datasetName: "",
  conditionLabel: "",
};

function parseRequiredNonNegative(
  rawValue: string,
  fieldLabel: string,
  rowIndex: number,
): { value: number | null; message: string | null } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      value: null,
      message: `第 ${rowIndex + 1} 筆 ${fieldLabel} 為必填欄位。`,
    };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return {
      value: null,
      message: `第 ${rowIndex + 1} 筆 ${fieldLabel} 必須為有效數值。`,
    };
  }

  if (parsed < 0) {
    return {
      value: null,
      message: `第 ${rowIndex + 1} 筆 ${fieldLabel} 不可小於 0。`,
    };
  }

  return { value: parsed, message: null };
}

export function MeasurementForm() {
  const [basicInfo, setBasicInfo] = useState<MeasurementBasicInfo>(initialBasicInfo);
  const [rows, setRows] = useState<ManualMeasurementRow[]>(createInitialManualRows());
  const [isSaving, setIsSaving] = useState(false);

  const saveManualInput = async () => {
    // TODO: 下輪改為 toast 提示，取代 alert。
    if (!basicInfo.datasetName.trim()) {
      alert("請輸入資料名稱。");
      return;
    }

    const validatedRecords: CreateMeasurementDatasetPayload["records"] = [];
    for (const [index, row] of rows.entries()) {
      const freq = parseRequiredNonNegative(row.freqHz, "FREQ", index);
      if (freq.message) {
        alert(freq.message);
        return;
      }
      const level = parseRequiredNonNegative(row.level, "LEVEL", index);
      if (level.message) {
        alert(level.message);
        return;
      }
      const rp = parseRequiredNonNegative(row.rp, "Rp", index);
      if (rp.message) {
        alert(rp.message);
        return;
      }
      const cp = parseRequiredNonNegative(row.cp, "Cp", index);
      if (cp.message) {
        alert(cp.message);
        return;
      }
      const rs = parseRequiredNonNegative(row.rs, "Rs", index);
      if (rs.message) {
        alert(rs.message);
        return;
      }
      const cs = parseRequiredNonNegative(row.cs, "Cs", index);
      if (cs.message) {
        alert(cs.message);
        return;
      }

      validatedRecords.push({
        indexNo: index + 1,
        freqHz: frequencyToHz(freq.value as number, row.freqUnit),
        level: level.value as number,
        rp: resistanceToOhm(rp.value as number, row.rpUnit),
        cp: capacitanceToFarad(cp.value as number, row.cpUnit),
        rs: resistanceToOhm(rs.value as number, row.rsUnit),
        cs: capacitanceToFarad(cs.value as number, row.csUnit),
      });
    }

    const payload: CreateMeasurementDatasetPayload = {
      datasetName: basicInfo.datasetName.trim(),
      conditionLabel: basicInfo.conditionLabel.trim(),
      records: validatedRecords,
    };

    setIsSaving(true);
    try {
      const response = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        alert(error.message ?? "儲存失敗。");
        return;
      }

      alert("量測資料儲存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="基本資訊">
        <MeasurementBasicInfoForm value={basicInfo} onChange={setBasicInfo} />
      </SectionCard>

      <SectionCard title="圖片上傳匯入">
        <MeasurementImportPanel onApplyRows={setRows} />
      </SectionCard>

      <SectionCard title="手動輸入量測資料">
        <MeasurementManualTable rows={rows} onRowsChange={setRows} />
        <MeasurementSaveActions onSave={saveManualInput} isSaving={isSaving} />
      </SectionCard>
    </>
  );
}
