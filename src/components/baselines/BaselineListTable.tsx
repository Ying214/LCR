"use client";

import Link from "next/link";

import type { BaselineProfile } from "@/lib/types";
import { formatDateTime } from "@/lib/formatters";
import {
  formatCapacitanceByMode,
  formatFrequencyByMode,
  formatLevelByMode,
  formatResistanceByMode,
} from "@/lib/unit-conversion";

import { useAppSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BaselineListTableProps = {
  baselines: BaselineProfile[];
  onDelete: (id: string) => Promise<void>;
};

const deleteWarningMessage =
  "刪除後既有 dataset 的 baselineId 會變成 null，但量測資料仍保留。確定要刪除嗎？";

export function BaselineListTable({ baselines, onDelete }: BaselineListTableProps) {
  const { settings } = useAppSettings();

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(deleteWarningMessage);
    if (!confirmed) {
      return;
    }
    await onDelete(id);
  };

  return (
    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名稱</TableHead>
            <TableHead>製程條件說明</TableHead>
            <TableHead>{settings.displayMode === "standard" ? "FREQ(Hz)" : "FREQ"}</TableHead>
            <TableHead>{settings.displayMode === "standard" ? "LEVEL(V)" : "LEVEL"}</TableHead>
            <TableHead>Rp</TableHead>
            <TableHead>Cp</TableHead>
            <TableHead>Rs</TableHead>
            <TableHead>Cs</TableHead>
            <TableHead>建立時間</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baselines.map((baseline) => (
            <TableRow key={baseline.id}>
              <TableCell>{baseline.name}</TableCell>
              <TableCell>{baseline.conditionLabel ?? "--"}</TableCell>
              <TableCell className="font-mono">{formatFrequencyByMode(baseline.freqHz, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatLevelByMode(baseline.level, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatResistanceByMode(baseline.rp, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatCapacitanceByMode(baseline.cp, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatResistanceByMode(baseline.rs, settings.displayMode)}</TableCell>
              <TableCell className="font-mono">{formatCapacitanceByMode(baseline.cs, settings.displayMode)}</TableCell>
              <TableCell>{formatDateTime(baseline.createdAt)}</TableCell>
              <TableCell className="space-x-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={`/baselines/${baseline.id}/edit`}>編輯</Link>
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(baseline.id)}>
                  刪除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
