"use client";

import {
  getDatasetSourceOptions,
  normalizeTargetSource,
  type DatasetCompareSource,
  type DatasetCompareTarget,
} from "@/lib/dataset-compare";
import type { MeasurementDatasetWithRelations } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DatasetCompareControlPanelProps = {
  datasets: MeasurementDatasetWithRelations[];
  targets: DatasetCompareTarget[];
  onTargetsChange: (targets: DatasetCompareTarget[]) => void;
  onAddTarget: () => void;
};

export function DatasetCompareControlPanel({
  datasets,
  targets,
  onTargetsChange,
  onAddTarget,
}: DatasetCompareControlPanelProps) {
  const updateTarget = (targetId: string, updater: (target: DatasetCompareTarget) => DatasetCompareTarget) => {
    onTargetsChange(targets.map((target) => (target.id === targetId ? updater(target) : target)));
  };

  const removeTarget = (targetId: string) => {
    if (targets.length <= 2) {
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
      <div className="space-y-2">
        {targets.map((target, index) => {
          const dataset = getDatasetById(target.datasetId);
          const sourceOptions = dataset ? getDatasetSourceOptions(dataset) : [{ value: "average", label: "平均值" }];

          return (
            <div key={target.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 lg:grid-cols-[120px_1fr_1fr_96px] lg:items-center">
              <p className="text-sm font-medium text-slate-800">比較對象 {index + 1}</p>

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
                  disabled={targets.length <= 2}
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
            + 新增比較對象
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
