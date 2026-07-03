"use client";

import { Fragment, useState } from "react";

import type { MeasurementDatasetWithRelations, MeasurementRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/formatters";
import type { OcrRecordTracking } from "@/lib/ocr-tracking";
import { summarizeOcrTracking } from "@/lib/ocr-tracking";
import {
  formatDisplayCapacitance,
  formatDisplayFrequency,
  formatDisplayLevel,
  formatDisplayResistance,
} from "@/lib/unit-conversion";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSettings } from "@/components/settings/SettingsProvider";

type MeasurementDatasetListProps = {
  datasets: MeasurementDatasetWithRelations[];
  expandedDatasetId: string | null;
  onToggleExpand: (datasetId: string) => void;
  onEditDataset: (dataset: MeasurementDatasetWithRelations) => void;
  onDeleteDataset: (dataset: MeasurementDatasetWithRelations) => void;
  onEditRecord: (datasetId: string, record: MeasurementRecord) => void;
  onDeleteRecord: (datasetId: string, record: MeasurementRecord) => void;
};

type OcrImageMode = "original" | "marked";

function resolveDefaultImageMode(hasOriginal: boolean, hasMarked: boolean): OcrImageMode | null {
  if (hasMarked) {
    return "marked";
  }
  if (hasOriginal) {
    return "original";
  }
  return null;
}

function resolveImageMode(
  preferred: OcrImageMode | undefined | null,
  hasOriginal: boolean,
  hasMarked: boolean,
): OcrImageMode | null {
  if (preferred === "original") {
    return hasOriginal ? "original" : resolveDefaultImageMode(hasOriginal, hasMarked);
  }
  if (preferred === "marked") {
    return hasMarked ? "marked" : resolveDefaultImageMode(hasOriginal, hasMarked);
  }
  return resolveDefaultImageMode(hasOriginal, hasMarked);
}

export function MeasurementDatasetList({
  datasets,
  expandedDatasetId,
  onToggleExpand,
  onEditDataset,
  onDeleteDataset,
  onEditRecord,
  onDeleteRecord,
}: MeasurementDatasetListProps) {
  const { settings, effectiveOcrAccuracyTrackingEnabled } = useAppSettings();
  const [ocrImageModeByDataset, setOcrImageModeByDataset] = useState<Record<string, OcrImageMode>>({});
  const [ocrImageExpandedByDataset, setOcrImageExpandedByDataset] = useState<Record<string, boolean>>({});

  const getRecordTracking = (record: MeasurementRecord): OcrRecordTracking | null => {
    const candidate = (record as MeasurementRecord & { ocrTracking?: OcrRecordTracking | null }).ocrTracking;
    return candidate ?? null;
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>資料組別</TableHead>
            <TableHead>資料名稱</TableHead>
            <TableHead>製程條件</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>筆數</TableHead>
            <TableHead>建立時間</TableHead>
            <TableHead>短 ID</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets.map((dataset, index) => {
            const expanded = expandedDatasetId === dataset.id;
            const hasOriginalImage = Boolean(dataset.metadata?.ocr?.originalImagePath);
            const hasMarkedImage = Boolean(dataset.metadata?.ocr?.markedImagePath);
            const hasAnyOcrImage = hasOriginalImage || hasMarkedImage;
            const selectedImageMode = resolveImageMode(
              ocrImageModeByDataset[dataset.id],
              hasOriginalImage,
              hasMarkedImage,
            );
            const selectedImageKind = selectedImageMode;
            const selectedImageLabel =
              selectedImageKind === "original"
                ? "原始上傳圖片"
                : selectedImageKind === "marked"
                  ? "OCR 標記圖片"
                  : "--";
            const selectedImageUrl =
              selectedImageKind === null
                ? null
                : `/api/measurements/${dataset.id}/ocr-image?kind=${selectedImageKind}`;
            const imageExpanded = Boolean(ocrImageExpandedByDataset[dataset.id]);
            const trackingSummary = summarizeOcrTracking(
              dataset.records as Array<{ ocrTracking?: OcrRecordTracking | null }>,
            );
            const showTrackingSummary =
              effectiveOcrAccuracyTrackingEnabled && trackingSummary.trackedRecordCount > 0;

            return (
              <Fragment key={dataset.id}>
                <TableRow>
                  <TableCell className="font-medium">第 {index + 1} 組資料</TableCell>
                  <TableCell>{dataset.datasetName}</TableCell>
                  <TableCell>{dataset.conditionLabel}</TableCell>
                  <TableCell>{dataset.baseline?.name ?? "--"}</TableCell>
                  <TableCell className="font-mono">{dataset.records.length}</TableCell>
                  <TableCell>{formatDateTime(dataset.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{dataset.id.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleExpand(dataset.id)}
                      >
                        {expanded ? "收合明細" : "查看明細"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => onEditDataset(dataset)}>
                        編輯
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => onDeleteDataset(dataset)}>
                        刪除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expanded ? (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-slate-50">
                      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                        {hasAnyOcrImage ? (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">OCR 圖片</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setOcrImageExpandedByDataset((prev) => ({ ...prev, [dataset.id]: !imageExpanded }))
                                }
                              >
                                {imageExpanded ? "收合 ▲" : "查看圖片 ▼"}
                              </Button>
                            </div>
                            {imageExpanded ? (
                              <>
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {hasOriginalImage ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={selectedImageMode === "original" ? "default" : "outline"}
                                      onClick={() =>
                                        setOcrImageModeByDataset((prev) => ({ ...prev, [dataset.id]: "original" }))
                                      }
                                    >
                                      原始上傳圖片
                                    </Button>
                                  ) : null}
                                  {hasMarkedImage ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={selectedImageMode === "marked" ? "default" : "outline"}
                                      onClick={() =>
                                        setOcrImageModeByDataset((prev) => ({ ...prev, [dataset.id]: "marked" }))
                                      }
                                    >
                                      OCR 標記圖片
                                    </Button>
                                  ) : null}
                                </div>

                                <p className="mb-2 text-xs text-slate-600">目前顯示：{selectedImageLabel}</p>
                                {selectedImageUrl ? (
                                  <a href={selectedImageUrl} target="_blank" rel="noreferrer">
                                    <img
                                      src={selectedImageUrl}
                                      alt={`${dataset.datasetName} ${selectedImageKind}`}
                                      className="max-h-[520px] w-full rounded border border-slate-200 object-contain bg-white"
                                      loading="lazy"
                                    />
                                  </a>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        ) : null}

                        {showTrackingSummary ? (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-800">
                              OCR 準確率：{((trackingSummary.accuracyRate ?? 0) * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-500">正確筆數：{trackingSummary.correctRecordCount} / {trackingSummary.trackedRecordCount}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              錯誤筆數：{trackingSummary.incorrectRecordCount}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              只要任一 OCR 預填欄位經人工修改，該筆即視為辨識錯誤。
                            </p>
                          </div>
                        ) : null}

                        <div className="rounded-md border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-sm font-semibold text-slate-800">量測明細</p>
                          <div className="overflow-auto rounded-md border border-slate-200">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>筆數</TableHead>
                                  <TableHead>FREQ</TableHead>
                                  <TableHead>LEVEL</TableHead>
                                  <TableHead>Rp</TableHead>
                                  <TableHead>Cp</TableHead>
                                  <TableHead>Rs</TableHead>
                                  <TableHead>Cs</TableHead>
                                  {effectiveOcrAccuracyTrackingEnabled ? <TableHead>OCR 準確率</TableHead> : null}
                                  <TableHead>操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dataset.records.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-mono">{record.indexNo}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayFrequency(record, settings.displayMode)}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayLevel(record, settings.displayMode)}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayResistance(record, "rp", settings.displayMode)}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayCapacitance(record, "cp", settings.displayMode)}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayResistance(record, "rs", settings.displayMode)}</TableCell>
                                    <TableCell className="font-mono">{formatDisplayCapacitance(record, "cs", settings.displayMode)}</TableCell>
                                    {effectiveOcrAccuracyTrackingEnabled ? (
                                      <TableCell className="font-mono text-xs text-slate-600">
                                        {(() => {
                                          const tracking = getRecordTracking(record);
                                          if (!tracking) {
                                            return "--";
                                          }
                                          return tracking.correctedFieldCount === 0
                                            ? `正確（${tracking.trackedFieldCount} 欄）`
                                            : `錯誤（修正 ${tracking.correctedFieldCount} 欄）`;
                                        })()}
                                      </TableCell>
                                    ) : null}
                                    <TableCell>
                                      <div className="flex gap-1.5">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => onEditRecord(dataset.id, record)}
                                        >
                                          編輯
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => onDeleteRecord(dataset.id, record)}
                                        >
                                          刪除
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
