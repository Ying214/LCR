"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  AppendMeasurementRecordsPayload,
  CreateMeasurementDatasetPayload,
  MeasurementDatasetListResponse,
  OcrMetadata,
} from "@/lib/api-types";
import { getClientDefaultServerTrackingEnabled } from "@/lib/app-settings";
import { buildOcrRecordTracking } from "@/lib/ocr-tracking";
import { capacitanceToFarad, frequencyToHz, resistanceToOhm } from "@/lib/unit-conversion";
import { useAppSettings } from "@/components/settings/SettingsProvider";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function parseOptionalNumber(
  rawValue: string,
  fieldLabel: string,
  rowIndex: number,
): { value: number | null; message: string | null } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { value: null, message: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return {
      value: null,
      message: `第 ${rowIndex + 1} 筆 ${fieldLabel} 必須為有效數值。`,
    };
  }

  return { value: parsed, message: null };
}

export function MeasurementForm() {
  const [saveMode, setSaveMode] = useState<"create" | "append">("create");
  const [targetDatasetId, setTargetDatasetId] = useState("");
  const [datasetOptions, setDatasetOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [datasetOptionsLoading, setDatasetOptionsLoading] = useState(false);
  const { effectiveOcrAccuracyTrackingEnabled, setServerTrackingEnabled } = useAppSettings();
  const [basicInfo, setBasicInfo] = useState<MeasurementBasicInfo>(initialBasicInfo);
  const [rows, setRows] = useState<ManualMeasurementRow[]>(createInitialManualRows());
  const [ocrMetadata, setOcrMetadata] = useState<OcrMetadata | null>(null);
  const [serverTrackingEnabled, setLocalServerTrackingEnabled] = useState<boolean>(
    getClientDefaultServerTrackingEnabled(),
  );
  const [isSaving, setIsSaving] = useState(false);

  const loadDatasetOptions = useCallback(async () => {
    setDatasetOptionsLoading(true);
    try {
      const response = await fetch("/api/measurements");
      if (!response.ok) {
        return;
      }
      const json = (await response.json()) as MeasurementDatasetListResponse;
      setDatasetOptions(
        json.data.map((dataset) => ({
          id: dataset.id,
          label: `${dataset.datasetName}（${dataset.conditionLabel || "未設定製程條件"}）`,
        })),
      );
    } finally {
      setDatasetOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasetOptions();
  }, [loadDatasetOptions]);

  useEffect(() => {
    if (saveMode === "append") {
      void loadDatasetOptions();
    }
  }, [saveMode, loadDatasetOptions]);

  const handleApplyRows = (
    nextRows: ManualMeasurementRow[],
    options?: {
      datasetNameSuggestion?: string;
      ocrMetadata?: OcrMetadata | null;
      serverTrackingEnabled?: boolean;
    },
  ) => {
    setRows(nextRows);
    setOcrMetadata(options?.ocrMetadata ?? null);
    const nextServerTrackingEnabled =
      options?.serverTrackingEnabled ?? getClientDefaultServerTrackingEnabled();
    setLocalServerTrackingEnabled(nextServerTrackingEnabled);
    setServerTrackingEnabled(nextServerTrackingEnabled);

    if (!options?.datasetNameSuggestion) {
      return;
    }

    setBasicInfo((prev) => {
      if (prev.datasetName.trim() !== "") {
        return prev;
      }
      return {
        ...prev,
        datasetName: options.datasetNameSuggestion ?? prev.datasetName,
      };
    });
  };

  const saveManualInput = async () => {
    // TODO: 下輪改為 toast 提示，取代 alert。
    if (saveMode === "create" && !basicInfo.datasetName.trim()) {
      alert("請輸入資料名稱。");
      return;
    }
    if (saveMode === "append" && !targetDatasetId) {
      alert("請先選擇要加入的既有資料集。");
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
      const rp = parseOptionalNumber(row.rp, "Rp", index);
      if (rp.message) {
        alert(rp.message);
        return;
      }
      const cp = parseOptionalNumber(row.cp, "Cp", index);
      if (cp.message) {
        alert(cp.message);
        return;
      }
      const rs = parseOptionalNumber(row.rs, "Rs", index);
      if (rs.message) {
        alert(rs.message);
        return;
      }
      const cs = parseOptionalNumber(row.cs, "Cs", index);
      if (cs.message) {
        alert(cs.message);
        return;
      }

      const normalizedFreqHz = frequencyToHz(freq.value as number, row.freqUnit);
      const normalizedLevel = level.value as number;
      const normalizedRp = rp.value === null ? null : resistanceToOhm(rp.value, row.rpUnit);
      const normalizedCp = cp.value === null ? null : capacitanceToFarad(cp.value, row.cpUnit);
      const normalizedRs = rs.value === null ? null : resistanceToOhm(rs.value, row.rsUnit);
      const normalizedCs = cs.value === null ? null : capacitanceToFarad(cs.value, row.csUnit);

      const ocrTracking =
        serverTrackingEnabled && effectiveOcrAccuracyTrackingEnabled
          ? buildOcrRecordTracking(row.ocrInitialSnapshot, {
              freqHz: normalizedFreqHz,
              level: normalizedLevel,
              rp: normalizedRp,
              cp: normalizedCp,
              rs: normalizedRs,
              cs: normalizedCs,
            })
          : null;

      validatedRecords.push({
        indexNo: index + 1,
        freqHz: normalizedFreqHz,
        level: normalizedLevel,
        rp: normalizedRp,
        cp: normalizedCp,
        rs: normalizedRs,
        cs: normalizedCs,
        freqRawValue: freq.value,
        freqRawUnit: row.freqUnit,
        levelRawValue: level.value,
        levelRawUnit: "v",
        rpRawValue: rp.value,
        rpRawUnit: rp.value === null ? null : row.rpUnit,
        cpRawValue: cp.value,
        cpRawUnit: cp.value === null ? null : row.cpUnit,
        rsRawValue: rs.value,
        rsRawUnit: rs.value === null ? null : row.rsUnit,
        csRawValue: cs.value,
        csRawUnit: cs.value === null ? null : row.csUnit,
        ocrTracking,
      });
    }

    setIsSaving(true);
    try {
      let response: Response;
      if (saveMode === "create") {
        const payload: CreateMeasurementDatasetPayload = {
          datasetName: basicInfo.datasetName.trim(),
          conditionLabel: basicInfo.conditionLabel.trim(),
          metadata: ocrMetadata ? { ocr: ocrMetadata } : undefined,
          records: validatedRecords,
        };
        response = await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const payload: AppendMeasurementRecordsPayload = {
          records: validatedRecords,
        };
        response = await fetch(`/api/measurements/${targetDatasetId}/records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        alert(error.message ?? "儲存失敗。");
        return;
      }

      if (saveMode === "create") {
        await loadDatasetOptions();
      }

      alert(saveMode === "create" ? "量測資料儲存成功。" : "量測資料已加入既有資料集。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="基本資訊">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>儲存模式</Label>
            <div className="flex flex-wrap gap-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "create"}
                  onChange={() => setSaveMode("create")}
                />
                建立新資料集
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "append"}
                  onChange={() => setSaveMode("append")}
                />
                加入既有資料集
              </label>
            </div>
          </div>

          {saveMode === "append" ? (
            <div className="space-y-2">
              <Label htmlFor="target-dataset-select">既有資料集</Label>
              <Select value={targetDatasetId} onValueChange={setTargetDatasetId}>
                <SelectTrigger id="target-dataset-select" className="max-w-xl bg-white">
                  <SelectValue placeholder={datasetOptionsLoading ? "載入中..." : "請選擇資料集"} />
                </SelectTrigger>
                <SelectContent>
                  {datasetOptions.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <MeasurementBasicInfoForm value={basicInfo} onChange={setBasicInfo} />
          )}
        </div>
      </SectionCard>

      <SectionCard title="圖片上傳匯入">
        <MeasurementImportPanel onApplyRows={handleApplyRows} />
      </SectionCard>

      <SectionCard title="手動輸入量測資料">
        <MeasurementManualTable rows={rows} onRowsChange={setRows} />
        <MeasurementSaveActions onSave={saveManualInput} isSaving={isSaving} />
      </SectionCard>
    </>
  );
}
