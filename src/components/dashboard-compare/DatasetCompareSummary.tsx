"use client";

import type { DatasetCompareRow } from "@/lib/dataset-compare";
import { formatCapacitance, formatResistance } from "@/lib/unit-conversion";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        目前沒有可比較對象。
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-slate-200 bg-white">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>比較對象</TableHead>
            <TableHead>Dataset Name</TableHead>
            <TableHead>Condition Label</TableHead>
            <TableHead>資料來源</TableHead>
            <TableHead>Rp</TableHead>
            <TableHead>Cp</TableHead>
            <TableHead>Rs</TableHead>
            <TableHead>Cs</TableHead>
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
              <TableCell className="font-mono">{formatResistance(row.values.rp)}</TableCell>
              <TableCell className="font-mono">{formatCapacitance(row.values.cp)}</TableCell>
              <TableCell className="font-mono">{formatResistance(row.values.rs)}</TableCell>
              <TableCell className="font-mono">{formatCapacitance(row.values.cs)}</TableCell>
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
