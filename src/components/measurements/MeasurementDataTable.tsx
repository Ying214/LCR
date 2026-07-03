"use client";

import { useMemo, useState } from "react";

import type { MeasurementDatasetWithRelations, TrendRecordSelection } from "@/lib/types";
import {
  formatDisplayCapacitance,
  formatDisplayFrequency,
  formatDisplayLevel,
  formatDisplayResistance,
} from "@/lib/unit-conversion";
import { formatDateTime } from "@/lib/formatters";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSettings } from "@/components/settings/SettingsProvider";

type MeasurementDataTableProps = {
  datasets: MeasurementDatasetWithRelations[];
  selectedRecord?: TrendRecordSelection | null;
  onSelectRecord?: (record: TrendRecordSelection) => void;
};

type SortDirection = "asc" | "desc";

export function MeasurementDataTable({
  datasets,
  selectedRecord,
  onSelectRecord,
}: MeasurementDataTableProps) {
  const { settings } = useAppSettings();
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const groupedDatasets = useMemo(() => {
    return datasets.map((dataset, index) => ({
      ...dataset,
      groupLabel: `第 ${index + 1} 組資料`,
      baselineName: dataset.baseline?.name ?? "--",
      records: [...dataset.records].sort((a, b) =>
        sortDirection === "asc" ? a.indexNo - b.indexNo : b.indexNo - a.indexNo,
      ),
    }));
  }, [datasets, sortDirection]);

  return (
    <div className="space-y-4">
      {groupedDatasets.map((dataset) => (
        <div key={dataset.id} className="overflow-hidden rounded-md border border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{dataset.groupLabel}</p>
              <p className="text-sm text-slate-700">
                {dataset.datasetName} / {dataset.conditionLabel}
              </p>
              <p className="text-xs text-slate-500">建立時間：{formatDateTime(dataset.createdAt)}</p>
            </div>
            <div className="space-y-1 text-right text-xs text-slate-600">
              <p>
                Baseline：<span className="font-medium text-slate-800">{dataset.baselineName}</span>
              </p>
              <p>
                明細筆數：<span className="font-medium text-slate-800">{dataset.records.length}</span>
              </p>
            </div>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    筆數 {sortDirection === "asc" ? "↑" : "↓"}
                  </TableHead>
                  <TableHead>{settings.displayMode === "standard" ? "FREQ(Hz)" : "FREQ"}</TableHead>
                  <TableHead>{settings.displayMode === "standard" ? "LEVEL(V)" : "LEVEL"}</TableHead>
                  <TableHead>Rp</TableHead>
                  <TableHead>Cp</TableHead>
                  <TableHead>Rs</TableHead>
                  <TableHead>Cs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.records.map((record) => (
                  <TableRow
                    key={record.id}
                    className={
                      selectedRecord?.datasetId === record.datasetId &&
                      selectedRecord.indexNo === record.indexNo
                        ? "bg-sky-100/70"
                        : onSelectRecord
                          ? "cursor-pointer hover:bg-slate-100"
                          : undefined
                    }
                    onClick={() =>
                      onSelectRecord?.({
                        datasetId: record.datasetId,
                        indexNo: record.indexNo,
                      })
                    }
                  >
                    <TableCell className="font-mono">{record.indexNo}</TableCell>
                    <TableCell className="font-mono">{formatDisplayFrequency(record, settings.displayMode)}</TableCell>
                    <TableCell className="font-mono">{formatDisplayLevel(record, settings.displayMode)}</TableCell>
                    <TableCell className="font-mono">{formatDisplayResistance(record, "rp", settings.displayMode)}</TableCell>
                    <TableCell className="font-mono">{formatDisplayCapacitance(record, "cp", settings.displayMode)}</TableCell>
                    <TableCell className="font-mono">{formatDisplayResistance(record, "rs", settings.displayMode)}</TableCell>
                    <TableCell className="font-mono">{formatDisplayCapacitance(record, "cs", settings.displayMode)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
