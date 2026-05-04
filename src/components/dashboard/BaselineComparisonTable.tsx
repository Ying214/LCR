import type { BaselineComparisonRow } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/formatters";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BaselineComparisonTableProps = {
  rows: BaselineComparisonRow[];
};

export function BaselineComparisonTable({ rows }: BaselineComparisonTableProps) {
  return (
    <div className="mb-4 rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>參數</TableHead>
            <TableHead>Baseline 值</TableHead>
            <TableHead>各筆量測值</TableHead>
            <TableHead>平均值</TableHead>
            <TableHead>偏差 %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                目前無可比較的 baseline 資料。
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.parameter}>
                <TableCell className="font-medium uppercase">{row.parameter}</TableCell>
                <TableCell className="font-mono">{formatNumber(row.baselineValue, 12)}</TableCell>
                <TableCell className="font-mono">
                  {row.measurementValues.length > 0
                    ? row.measurementValues.map((value) => formatNumber(value, 6)).join(", ")
                    : "--"}
                </TableCell>
                <TableCell className="font-mono">{formatNumber(row.averageValue, 12)}</TableCell>
                <TableCell className="font-mono">{formatPercent(row.deviationPercent, 2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
