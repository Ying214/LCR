"use client";

import {
  normalizeTargetSource,
  type DatasetCompareSource,
  type DatasetCompareTarget,
} from "@/lib/dataset-compare";
import type { BaselineProfile, MeasurementDatasetWithRelations } from "@/lib/types";
import { formatFrequencyByMode, formatLevelByMode } from "@/lib/unit-conversion";

import { BaselineSelector } from "@/components/baselines/BaselineSelector";
import { useAppSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type DatasetCompareControlPanelProps = {
  datasets: MeasurementDatasetWithRelations[];
  targets: DatasetCompareTarget[];
  onTargetsChange: (targets: DatasetCompareTarget[]) => void;
  onAddTarget: () => void;
  useBaselineAsC1: boolean;
  onUseBaselineAsC1Change: (checked: boolean) => void;
  baselines: BaselineProfile[];
  selectedBaselineId: string;
  onSelectedBaselineIdChange: (baselineId: string) => void;
  baselineWarning: string | null;
};

function buildSourceOptions(
  dataset: MeasurementDatasetWithRelations,
  displayMode: "standard" | "friendly",
): Array<{ value: DatasetCompareSource; label: string }> {
  const options: Array<{ value: DatasetCompareSource; label: string }> = [{ value: "average", label: "全部平均" }];

  const uniqueFreqHz = [...new Set(dataset.records.map((record) => record.freqHz).filter(Number.isFinite))].sort((a, b) => a - b);
  uniqueFreqHz.forEach((freqHz) => {
    options.push({
      value: `freq:${freqHz}` as DatasetCompareSource,
      label: `${formatFrequencyByMode(freqHz, displayMode)} 平均`,
    });
  });

  const recordByIndex = new Map<number, MeasurementDatasetWithRelations["records"][number]>();
  dataset.records.forEach((record) => {
    if (!recordByIndex.has(record.indexNo)) {
      recordByIndex.set(record.indexNo, record);
    }
  });

  const indexRecords = [...recordByIndex.values()].sort((a, b) => a.indexNo - b.indexNo);
  indexRecords.forEach((record) => {
    options.push({
      value: `index:${record.indexNo}` as DatasetCompareSource,
      label: `第${record.indexNo}筆 (${formatFrequencyByMode(record.freqHz, displayMode)} / ${formatLevelByMode(record.level, displayMode)})`,
    });
  });

  return options;
}

export function DatasetCompareControlPanel({
  datasets,
  targets,
  onTargetsChange,
  onAddTarget,
  useBaselineAsC1,
  onUseBaselineAsC1Change,
  baselines,
  selectedBaselineId,
  onSelectedBaselineIdChange,
  baselineWarning,
}: DatasetCompareControlPanelProps) {
  const { settings } = useAppSettings();
  const minTargets = useBaselineAsC1 ? 1 : 2;
  const canRemoveTarget = targets.length > minTargets;

  const updateTarget = (targetId: string, updater: (target: DatasetCompareTarget) => DatasetCompareTarget) => {
    onTargetsChange(targets.map((target) => (target.id === targetId ? updater(target) : target)));
  };

  const removeTarget = (targetId: string) => {
    if (!canRemoveTarget) {
      return;
    }
    onTargetsChange(targets.filter((target) => target.id !== targetId));
  };

  const getDatasetById = (datasetId: string) => datasets.find((dataset) => dataset.id === datasetId) ?? null;

  const changeDataset = (targetId: string, datasetId: string) => {
    updateTarget(targetId, (target) => {
      const dataset = getDatasetById(datasetId);
      const nextSource = normalizeTargetSource(dataset, target.source);
      return {
        ...target,
        datasetId,
        source: nextSource,
      };
    });
  };

  const changeSource = (targetId: string, source: string) => {
    updateTarget(targetId, (target) => ({
      ...target,
      source: source as DatasetCompareSource,
    }));
  };

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">使用 Baseline 作為 Sample 1</p>
            <p className="text-xs text-slate-600">
              開啟後會使用下方選擇的 Baseline 作為 Sample 1，原本 dataset 目標從 Sample 2 開始。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">{useBaselineAsC1 ? "ON" : "OFF"}</span>
            <Switch id="use-baseline-as-c1" checked={useBaselineAsC1} onCheckedChange={onUseBaselineAsC1Change} />
          </div>
        </div>
        {useBaselineAsC1 ? (
          <div className="mt-3 max-w-md">
            <BaselineSelector
              label="Baseline"
              value={selectedBaselineId}
              baselines={baselines}
              placeholder="選擇 baseline"
              includeEmpty
              emptyLabel="請選擇 baseline"
              onChange={onSelectedBaselineIdChange}
            />
          </div>
        ) : null}
        {baselineWarning ? <p className="mt-2 text-xs font-medium text-amber-700">{baselineWarning}</p> : null}
      </div>

      <div className="space-y-2">
        {targets.map((target, index) => {
          const dataset = getDatasetById(target.datasetId);
          const sourceOptions = dataset
            ? buildSourceOptions(dataset, settings.displayMode)
            : [{ value: "average", label: "全部平均" }];

          return (
            <div key={target.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 lg:grid-cols-[120px_1fr_1fr_96px] lg:items-center">
              <p className="text-sm font-medium text-slate-800">比較樣本 {index + 1}</p>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Dataset</Label>
                <Select value={target.datasetId} onValueChange={(value) => changeDataset(target.id, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選擇 dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.datasetName}（{item.conditionLabel || "未設定製程條件"}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">資料來源</Label>
                <Select value={target.source} onValueChange={(value) => changeSource(target.id, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選擇資料來源" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={`${target.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-5 lg:pt-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canRemoveTarget}
                  onClick={() => removeTarget(target.id)}
                  className="w-full"
                >
                  移除
                </Button>
              </div>
            </div>
          );
        })}

        <div>
          <Button type="button" variant="outline" onClick={onAddTarget}>
            + 新增比較樣本
          </Button>
        </div>
      </div>
      {datasets.length === 0 ? (
        <p className="text-xs text-amber-700">
          目前沒有可選 dataset，請先新增量測資料。
        </p>
      ) : null}
    </div>
  );
}
