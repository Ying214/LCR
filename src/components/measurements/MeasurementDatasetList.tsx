"use client";

import { Fragment } from "react";

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

export function MeasurementDatasetList({
  datasets,
  expandedDatasetId,
  onToggleExpand,
  onEditDataset,
  onDeleteDataset,
  onEditRecord,
  onDeleteRecord,
}: MeasurementDatasetListProps) {
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
