"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";

import type { OcrMetadata, OcrServiceResponse } from "@/lib/api-types";
import { extractMeasurementRecordsFromOcr } from "@/lib/ocr-parser";
import type { OcrInitialSnapshot } from "@/lib/ocr-tracking";
import { capacitanceToFarad, frequencyToHz, resistanceToOhm } from "@/lib/unit-conversion";
import { cn } from "@/lib/utils";

import type { ManualMeasurementRow } from "@/components/measurements/MeasurementManualTable";
import { Button } from "@/components/ui/button";

type ApiErrorResponse = {
  message?: string;
};

type MeasurementImportPanelProps = {
  onApplyRows: (
    rows: ManualMeasurementRow[],
    options?: {
      datasetNameSuggestion?: string;
      ocrMetadata?: OcrMetadata | null;
      serverTrackingEnabled?: boolean;
    },
  ) => void;
};

type OcrConfidenceState = {
  label: string;
  description: string;
  className: string;
};

type OcrIssueSummary = {
  missingValues: string[];
  lowScores: string[];
};

const LOW_SCORE_THRESHOLD = 0.8;
const OCR_CHECK_FIELDS = [
  { valueKey: "freqHz", scoreKey: "freqScore", label: "FREQ" },
  { valueKey: "level", scoreKey: "levelScore", label: "LEVEL" },
  { valueKey: "rp", scoreKey: "rpScore", label: "Rp" },
  { valueKey: "cp", scoreKey: "cpScore", label: "Cp" },
  { valueKey: "rs", scoreKey: "rsScore", label: "Rs" },
  { valueKey: "cs", scoreKey: "csScore", label: "Cs" },
] as const;

function formatTimestampForDatasetName(value: Date): string {
  const year = value.getFullYear().toString().padStart(4, "0");
  const month = (value.getMonth() + 1).toString().padStart(2, "0");
  const day = value.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function sanitizeDatasetBaseName(originalFilename: string | null): string {
  const source = (originalFilename ?? "").trim();
  const withoutExtension = source.replace(/\.[^.]+$/, "").trim();
  const candidate = withoutExtension || "ocr_upload";

  return candidate
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "") || "ocr_upload";
}

function buildDatasetNameSuggestion(originalFilename: string | null, uploadedAt?: Date): string {
  const timestamp = formatTimestampForDatasetName(uploadedAt ?? new Date());
  const baseName = sanitizeDatasetBaseName(originalFilename);
  return `${timestamp}_${baseName}`;
}

function resolveAverageScore(ocrResponse: OcrServiceResponse | null): number | null {
  if (!ocrResponse) {
    return null;
  }
  if (typeof ocrResponse.average_score === "number") {
    return ocrResponse.average_score;
  }
  const scores = ocrResponse.results
    .map((result) => result.average_score)
    .filter((score): score is number => typeof score === "number");
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function getConfidenceState(score: number | null): OcrConfidenceState {
  if (score === null) {
    return {
      label: "未提供",
      description: "OCR service 未回傳平均信心度",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }
  if (score >= 0.9) {
    return {
      label: "正常",
      description: "辨識品質良好",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (score >= 0.75) {
    return {
      label: "提醒檢查",
      description: "建議人工檢查關鍵欄位",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "警示",
    description: "辨識可能不準，請逐列確認",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

function parseSnapshotNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialSnapshot(row: ManualMeasurementRow): OcrInitialSnapshot | null {
  const snapshot: OcrInitialSnapshot = {};
  const freqValue = parseSnapshotNumber(row.freqHz);
  const levelValue = parseSnapshotNumber(row.level);
  const rpValue = parseSnapshotNumber(row.rp);
  const cpValue = parseSnapshotNumber(row.cp);
  const rsValue = parseSnapshotNumber(row.rs);
  const csValue = parseSnapshotNumber(row.cs);

  if (freqValue !== null) {
    snapshot.freqHz = frequencyToHz(freqValue, row.freqUnit);
  }
  if (levelValue !== null) {
    snapshot.level = levelValue;
  }
  if (rpValue !== null) {
    snapshot.rp = resistanceToOhm(rpValue, row.rpUnit);
  }
  if (cpValue !== null) {
    snapshot.cp = capacitanceToFarad(cpValue, row.cpUnit);
  }
  if (rsValue !== null) {
    snapshot.rs = resistanceToOhm(rsValue, row.rsUnit);
  }
  if (csValue !== null) {
    snapshot.cs = capacitanceToFarad(csValue, row.csUnit);
  }

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

function buildManualRows(
  ocrResponse: OcrServiceResponse,
  enableTracking: boolean,
): ManualMeasurementRow[] {
  const parsedRows = extractMeasurementRecordsFromOcr(ocrResponse);
  return parsedRows.map((row) => {
    const manualRow: ManualMeasurementRow = {
      rowId: `ocr-row-${Date.now()}-${Math.random()}`,
      freqHz: row.freqHz,
      level: row.level,
      rp: row.rp,
      cp: row.cp,
      rs: row.rs,
      cs: row.cs,
      fromOcr: true,
      freqUnit: row.freqUnit,
      rpUnit: row.rpUnit,
      cpUnit: row.cpUnit,
      rsUnit: row.rsUnit,
      csUnit: row.csUnit,
      freqScore: row.freqScore,
      levelScore: row.levelScore,
      rpScore: row.rpScore,
      cpScore: row.cpScore,
      rsScore: row.rsScore,
      csScore: row.csScore,
      ocrInitialSnapshot: null,
    };

    if (enableTracking) {
      manualRow.ocrInitialSnapshot = buildInitialSnapshot(manualRow);
    }

    return manualRow;
  });
}

function getDebugImage(ocrResponse: OcrServiceResponse | null): string | null {
  if (!ocrResponse) {
    return null;
  }
  if (ocrResponse.images?.ocr_res_img) {
    return ocrResponse.images.ocr_res_img;
  }
  for (const result of ocrResponse.results) {
    if (result.images?.ocr_res_img) {
      return result.images.ocr_res_img;
    }
  }
  return null;
}

function getOriginalDebugImage(ocrResponse: OcrServiceResponse | null): string | null {
  if (!ocrResponse) {
    return null;
  }

  const tryResolveFromImages = (images: Record<string, string> | undefined) => {
    if (!images) {
      return null;
    }

    const preferredKeys = [
      "input_img",
      "input_image",
      "origin_img",
      "origin_image",
      "original_img",
      "original_image",
      "src_img",
      "normalized_img",
      "preprocessed_img",
    ];

    for (const key of preferredKeys) {
      const resolved = images[key];
      if (resolved) {
        return resolved;
      }
    }

    for (const [key, value] of Object.entries(images)) {
      if (key !== "ocr_res_img" && value) {
        return value;
      }
    }

    return null;
  };

  const mergedResolved = tryResolveFromImages(ocrResponse.images);
  if (mergedResolved) {
    return mergedResolved;
  }

  for (const result of ocrResponse.results) {
    const resolved = tryResolveFromImages(result.images);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function createIssueSummary(rows: ManualMeasurementRow[]): OcrIssueSummary {
  const missingValues: string[] = [];
  const lowScores: string[] = [];

  for (const [index, row] of rows.entries()) {
    for (const field of OCR_CHECK_FIELDS) {
      const value = String(row[field.valueKey] ?? "").trim();
      const fieldLabel = `第 ${index + 1} 筆 ${field.label}`;
      if (!value) {
        missingValues.push(fieldLabel);
        continue;
      }

      const score = row[field.scoreKey];
      if (typeof score === "number" && score < LOW_SCORE_THRESHOLD) {
        lowScores.push(fieldLabel);
      }
    }

  }

  return { missingValues, lowScores };
}

export function MeasurementImportPanel({ onApplyRows }: MeasurementImportPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ocrResponse, setOcrResponse] = useState<OcrServiceResponse | null>(null);
  const [ocrRows, setOcrRows] = useState<ManualMeasurementRow[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const averageScore = useMemo(() => resolveAverageScore(ocrResponse), [ocrResponse]);
  const confidenceState = useMemo(() => getConfidenceState(averageScore), [averageScore]);
  const debugImage = useMemo(() => getDebugImage(ocrResponse), [ocrResponse]);
  const debugOriginalImage = useMemo(() => getOriginalDebugImage(ocrResponse), [ocrResponse]);
  const issueSummary = useMemo(() => createIssueSummary(ocrRows), [ocrRows]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("請先選擇圖片檔案。");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json().catch(() => null)) as OcrServiceResponse | ApiErrorResponse | null;

      if (!response.ok) {
        const message = (json as ApiErrorResponse | null)?.message ?? "OCR 辨識失敗，請稍後再試。";
        setErrorMessage(message);
        setOcrResponse(null);
        return;
      }

      const nextResponse = json as OcrServiceResponse;
      const trackingEnabled = nextResponse.ocrAccuracyTrackingEnabled ?? true;
      const rows = buildManualRows(nextResponse, trackingEnabled);
      const ocrMetadata = nextResponse.ocrMetadata ?? null;
      const datasetNameSuggestion =
        ocrMetadata?.datasetNameSuggestion ?? buildDatasetNameSuggestion(selectedFile.name, new Date());
      setOcrResponse(nextResponse);

      if (rows.length === 0) {
        setOcrRows([]);
        setErrorMessage("OCR 完成，但尚未解析出可預填的量測列，請檢查圖片品質或手動輸入。");
        return;
      }

      setOcrRows(rows);
      onApplyRows(rows, {
        datasetNameSuggestion,
        ocrMetadata,
        serverTrackingEnabled: trackingEnabled,
      });
      setSuccessMessage(`已從 OCR 匯入 ${rows.length} 筆，請在下方表格確認並可手動修改。`);
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch {
      setErrorMessage("無法呼叫 OCR API，請確認 OCR service 是否已啟動。");
      setOcrResponse(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={(event) => void handleSubmit(event)}>
        <input
          key={fileInputKey}
          id="ocr-image-file"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />

        <Button type="button" variant="secondary" asChild>
          <label htmlFor="ocr-image-file" className="cursor-pointer bg-slate-800 text-white hover:bg-slate-700">
            {selectedFile ? "重新選擇圖片" : "選擇圖片"}
          </label>
        </Button>

        <Button type="submit" disabled={isUploading || !selectedFile} className="bg-emerald-600 text-white hover:bg-emerald-500">
          {isUploading ? "辨識中..." : "上傳並預填表格"}
        </Button>

        <p className="text-xs text-slate-500">
          {selectedFile ? `已選擇：${selectedFile.name}` : "尚未選擇檔案"}
        </p>
      </form>

      {errorMessage ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {ocrResponse ? (
        <div className={cn("rounded-md border px-3 py-2 text-sm", confidenceState.className)}>
          <p className="font-medium">{confidenceState.description}</p>
          <p className="mt-1 text-xs">品質等級：{confidenceState.label}</p>
          {issueSummary.missingValues.length > 0 ? (
            <p className="mt-2 text-xs text-rose-700">
              以下欄位缺少辨識值，請優先檢查：{issueSummary.missingValues.join("、")}
            </p>
          ) : null}
          {issueSummary.lowScores.length > 0 ? (
            <p className="mt-1 text-xs text-rose-700">
              以下欄位信心度偏低，請檢查：{issueSummary.lowScores.join("、")}
            </p>
          ) : null}
          {issueSummary.missingValues.length === 0 &&
          issueSummary.lowScores.length === 0 &&
          ocrRows.length > 0 ? (
            <p className="mt-1 text-xs text-emerald-700">所有已辨識欄位信心度正常</p>
          ) : null}
        </div>
      ) : null}

      {ocrResponse ? (
        <details
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          open={debugOpen}
          onToggle={(event) => setDebugOpen((event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-700">開發用 debug 資訊</summary>
          <div className="mt-3 flex flex-col gap-3">
            {debugOriginalImage ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">原始上傳圖片（debug）</p>
                <Image
                  src={`data:image/png;base64,${debugOriginalImage}`}
                  alt="OCR debug original"
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-96 w-full rounded-md border border-slate-200 object-contain"
                />
              </div>
            ) : null}
            {debugImage ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">OCR 標註圖（debug）</p>
                <Image
                  src={`data:image/png;base64,${debugImage}`}
                  alt="OCR debug annotation"
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-96 w-full rounded-md border border-slate-200 object-contain"
                />
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
