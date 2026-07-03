"use client";

import type { DatasetCompareRow } from "@/lib/dataset-compare";
import {
  formatCapacitanceByMode,
  formatFrequencyByMode,
  formatLevelByMode,
  formatResistanceByMode,
} from "@/lib/unit-conversion";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSettings } from "@/components/settings/SettingsProvider";

type DatasetCompareSummaryProps = {
  rows: DatasetCompareRow[];
};

function renderMissingMessages(messages: string[]) {
  if (messages.length === 0) {
    return "--";
  }
  return messages.join("；");
}

export function DatasetCompareSummary({ rows }: DatasetCompareSummaryProps) {
  const { settings } = useAppSettings();

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        目前沒有可比較樣本。
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-slate-200 bg-white">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>比較樣本</TableHead>
            <TableHead>Dataset Name</TableHead>
            <TableHead>Condition Label</TableHead>
            <TableHead>資料來源</TableHead>
            <TableHead>FREQ</TableHead>
            <TableHead>LEVEL</TableHead>
            <TableHead>Rp</TableHead>
            <TableHead>Cp</TableHead>
            <TableHead>Rs</TableHead>
            <TableHead>Cs</TableHead>
            <TableHead>Records Count</TableHead>
            <TableHead>缺值提示</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.targetId}>
              <TableCell className="font-semibold">{row.targetCode}</TableCell>
              <TableCell>{row.datasetName}</TableCell>
              <TableCell>{row.conditionLabel}</TableCell>
              <TableCell>{row.sourceLabel}</TableCell>
              <TableCell className="font-mono">{formatFrequencyByMode(row.freqHz, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatLevelByMode(row.level, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatResistanceByMode(row.values.rp, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatCapacitanceByMode(row.values.cp, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatResistanceByMode(row.values.rs, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatCapacitanceByMode(row.values.cs, settings.displayMode)}</TableCell>
              <TableCell>{row.recordCount}</TableCell>
              <TableCell className="text-xs text-amber-700">
                {renderMissingMessages(row.missingMessages)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
