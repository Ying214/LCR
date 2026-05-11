"use client";

import { Fragment, useState } from "react";

import type { MeasurementDatasetWithRelations, MeasurementRecord } from "@/lib/types";
import { formatDateTime, formatLevel } from "@/lib/formatters";
import { formatCapacitance, formatFrequencyWithUnit, formatResistance } from "@/lib/unit-conversion";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [ocrImageModeByDataset, setOcrImageModeByDataset] = useState<Record<string, OcrImageMode>>({});
  const [ocrImageExpandedByDataset, setOcrImageExpandedByDataset] = useState<Record<string, boolean>>({});

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

                        <div className="rounded-md border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-sm font-semibold text-slate-800">量測明細</p>
                          <div className="overflow-auto rounded-md border border-slate-200">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>筆數</TableHead>
                                  <TableHead>FREQ</TableHead>
                                  <TableHead>LEVEL (V)</TableHead>
                                  <TableHead>Rp</TableHead>
                                  <TableHead>Cp</TableHead>
                                  <TableHead>Rs</TableHead>
                                  <TableHead>Cs</TableHead>
                                  <TableHead>操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dataset.records.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-mono">{record.indexNo}</TableCell>
                                    <TableCell className="font-mono">{formatFrequencyWithUnit(record.freqHz)}</TableCell>
                                    <TableCell className="font-mono">{formatLevel(record.level)} V</TableCell>
                                    <TableCell className="font-mono">{formatResistance(record.rp)}</TableCell>
                                    <TableCell className="font-mono">{formatCapacitance(record.cp)}</TableCell>
                                    <TableCell className="font-mono">{formatResistance(record.rs)}</TableCell>
                                    <TableCell className="font-mono">{formatCapacitance(record.cs)}</TableCell>
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
