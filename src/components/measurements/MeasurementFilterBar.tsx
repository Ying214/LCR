"use client";

import type { BaselineProfile, MeasurementFilter } from "@/lib/types";
import { formatFrequencyWithUnit } from "@/lib/unit-conversion";

import { BaselineSelector } from "@/components/baselines/BaselineSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MeasurementFilterBarProps = {
  filters: MeasurementFilter;
  baselines: BaselineProfile[];
  conditionOptions: string[];
  frequencyOptions: number[];
  levelOptions: number[];
  onFiltersChange: (filters: MeasurementFilter) => void;
  onApply: () => void;
  onReset: () => void;
};

export function MeasurementFilterBar({
  filters,
  baselines,
  conditionOptions,
  frequencyOptions,
  levelOptions,
  onFiltersChange,
  onApply,
  onReset,
}: MeasurementFilterBarProps) {
  const safeConditionOptions = Array.from(
    new Set(conditionOptions.map((option) => option.trim()).filter((option) => option.length > 0)),
  );
  const safeFrequencyOptions = Array.from(new Set(frequencyOptions.filter(Number.isFinite)));
  const safeLevelOptions = Array.from(new Set(levelOptions.filter(Number.isFinite)));
  const safeBaselines = baselines.filter((baseline) => baseline.id.trim().length > 0);

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="datasetNameFilter">資料名稱</Label>
          <Input
            id="datasetNameFilter"
            value={filters.datasetName}
            onChange={(event) => onFiltersChange({ ...filters, datasetName: event.target.value })}
            placeholder="輔助搜尋（contains）"
          />
        </div>
        <div className="space-y-2">
          <Label>製程條件</Label>
          <Select
            value={filters.conditionLabel || "__all__"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, conditionLabel: value === "__all__" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇製程條件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">未選擇</SelectItem>
              {safeConditionOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>FREQ(Hz)</Label>
          <Select
            value={filters.freqHz || "__all__"}
            onValueChange={(value) => onFiltersChange({ ...filters, freqHz: value === "__all__" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="未選擇" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">未選擇</SelectItem>
              {safeFrequencyOptions.map((option) => (
                <SelectItem key={option.toString()} value={option.toString()}>
                  {formatFrequencyWithUnit(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>LEVEL</Label>
          <Select
            value={filters.level || "__all__"}
            onValueChange={(value) => onFiltersChange({ ...filters, level: value === "__all__" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="未選擇" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">未選擇</SelectItem>
              {safeLevelOptions.map((option) => (
                <SelectItem key={option.toString()} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <BaselineSelector
          label="Baseline（僅篩選）"
          value={filters.baselineId}
          baselines={safeBaselines}
          emptyLabel="未選擇"
          onChange={(baselineId) => onFiltersChange({ ...filters, baselineId })}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={onApply}>
          查詢
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          重設
        </Button>
      </div>
    </div>
  );
}
