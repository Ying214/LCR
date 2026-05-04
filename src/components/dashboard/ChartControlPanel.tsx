"use client";

import type { ComparisonMode, ParameterKey } from "@/lib/types";
import { TrialIndexSelector } from "@/components/dashboard/TrialIndexSelector";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChartControlPanelProps = {
  showAverage?: boolean;
  showBaseline?: boolean;
  showTrials?: boolean;
  showDeviation?: boolean;
  onShowAverageChange?: (checked: boolean) => void;
  onShowBaselineChange?: (checked: boolean) => void;
  onShowTrialsChange?: (checked: boolean) => void;
  onShowDeviationChange?: (checked: boolean) => void;
  parameter?: ParameterKey;
  onParameterChange?: (parameter: ParameterKey) => void;
  compareMode?: ComparisonMode;
  onCompareModeChange?: (mode: ComparisonMode) => void;
  conditionOptions?: string[];
  selectedConditions?: string[];
  onSelectedConditionsChange?: (conditions: string[]) => void;
  trialIndexOptions?: number[];
  selectedTrialIndexes?: number[];
  onSelectedTrialIndexesChange?: (indexes: number[]) => void;
  baselineCondition?: string;
  onBaselineConditionChange?: (condition: string) => void;
  parameterVariant?: "select" | "tabs";
  conditionLayout?: boolean;
};

export function ChartControlPanel({
  showAverage,
  showBaseline,
  showTrials,
  showDeviation,
  onShowAverageChange,
  onShowBaselineChange,
  onShowTrialsChange,
  onShowDeviationChange,
  parameter,
  onParameterChange,
  compareMode,
  onCompareModeChange,
  conditionOptions,
  selectedConditions,
  onSelectedConditionsChange,
  trialIndexOptions,
  selectedTrialIndexes,
  onSelectedTrialIndexesChange,
  baselineCondition,
  onBaselineConditionChange,
  parameterVariant = "select",
  conditionLayout = false,
}: ChartControlPanelProps) {
  const allSelected =
    !!conditionOptions &&
    conditionOptions.length > 0 &&
    !!selectedConditions &&
    selectedConditions.length === conditionOptions.length;

  const toggleCondition = (condition: string, checked: boolean) => {
    if (!onSelectedConditionsChange || !conditionOptions || !selectedConditions) {
      return;
    }

    if (checked) {
      const next = selectedConditions.includes(condition)
        ? selectedConditions
        : [...selectedConditions, condition];
      onSelectedConditionsChange(next);
      return;
    }

    onSelectedConditionsChange(selectedConditions.filter((item) => item !== condition));
  };

  const moveCondition = (condition: string, direction: "up" | "down") => {
    if (!onSelectedConditionsChange || !selectedConditions) {
      return;
    }
    const index = selectedConditions.indexOf(condition);
    if (index < 0) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedConditions.length) {
      return;
    }

    const next = [...selectedConditions];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onSelectedConditionsChange(next);
  };

  return (
    <div className="mb-3 grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-5">
      {conditionLayout ? (
        <div className="grid gap-3 md:grid-cols-[auto_1fr_220px] md:items-end lg:col-span-5">
          {onShowBaselineChange ? (
            <div className="flex items-center space-x-2">
              <Checkbox checked={showBaseline} onCheckedChange={(checked) => onShowBaselineChange(checked === true)} />
              <Label className="font-normal">顯示 baseline 線</Label>
            </div>
          ) : (
            <div />
          )}

          {onParameterChange ? (
            <div className="space-y-1">
              <Label>參數切換</Label>
              <Tabs
                value={parameter}
                onValueChange={(value) => onParameterChange(value as ParameterKey)}
              >
                <TabsList variant="default">
                  <TabsTrigger value="rp">Rp</TabsTrigger>
                  <TabsTrigger value="cp">Cp</TabsTrigger>
                  <TabsTrigger value="rs">Rs</TabsTrigger>
                  <TabsTrigger value="cs">Cs</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          ) : (
            <div />
          )}

          {onCompareModeChange ? (
            <div className="space-y-1">
              <Label>比較模式</Label>
              <Select value={compareMode} onValueChange={(value) => onCompareModeChange(value as ComparisonMode)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="average">平均值</SelectItem>
                  <SelectItem value="median">中位數</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}
        </div>
      ) : null}

      {!conditionLayout && onShowAverageChange ? (
        <div className="flex items-center space-x-2">
          <Checkbox checked={showAverage} onCheckedChange={(checked) => onShowAverageChange(checked === true)} />
          <Label className="font-normal">顯示平均線</Label>
        </div>
      ) : null}
      {!conditionLayout && onShowBaselineChange ? (
        <div className="flex items-center space-x-2">
          <Checkbox checked={showBaseline} onCheckedChange={(checked) => onShowBaselineChange(checked === true)} />
          <Label className="font-normal">顯示 baseline 線</Label>
        </div>
      ) : null}
      {!conditionLayout && onShowTrialsChange ? (
        <div className="flex items-center space-x-2">
          <Checkbox checked={showTrials} onCheckedChange={(checked) => onShowTrialsChange(checked === true)} />
          <Label className="font-normal">顯示單筆量測</Label>
        </div>
      ) : null}
      {!conditionLayout && onShowDeviationChange ? (
        <div className="flex items-center space-x-2">
          <Checkbox checked={showDeviation} onCheckedChange={(checked) => onShowDeviationChange(checked === true)} />
          <Label className="font-normal">顯示偏差 %</Label>
        </div>
      ) : null}

      {!conditionLayout && onParameterChange && parameterVariant === "select" ? (
        <div className="space-y-1">
          <Label>參數切換</Label>
          <Select value={parameter} onValueChange={(value) => onParameterChange(value as ParameterKey)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rp">Rp</SelectItem>
              <SelectItem value="cp">Cp</SelectItem>
              <SelectItem value="rs">Rs</SelectItem>
              <SelectItem value="cs">Cs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!conditionLayout && onParameterChange && parameterVariant === "tabs" ? (
        <div className="space-y-1 lg:col-span-3">
          <Label>參數切換</Label>
          <Tabs value={parameter} onValueChange={(value) => onParameterChange(value as ParameterKey)}>
            <TabsList variant="default">
              <TabsTrigger value="rp">Rp</TabsTrigger>
              <TabsTrigger value="cp">Cp</TabsTrigger>
              <TabsTrigger value="rs">Rs</TabsTrigger>
              <TabsTrigger value="cs">Cs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {!conditionLayout && onCompareModeChange ? (
        <div className="space-y-1">
          <Label>比較模式</Label>
          <Select value={compareMode} onValueChange={(value) => onCompareModeChange(value as ComparisonMode)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="average">平均值</SelectItem>
              <SelectItem value="median">中位數</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {onSelectedConditionsChange && conditionOptions && selectedConditions ? (
        <div className="space-y-2 lg:col-span-5">
          <div className="flex items-center justify-between">
            <Label>製程條件多選</Label>
            <button
              type="button"
              className="text-xs text-slate-500 underline underline-offset-2"
              onClick={() =>
                onSelectedConditionsChange(allSelected ? [] : conditionOptions)
              }
            >
              {allSelected ? "清除全選" : "全選"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {conditionOptions.map((condition) => (
              <label key={condition} className="flex items-center space-x-2 text-sm">
                <Checkbox
                  checked={selectedConditions.includes(condition)}
                  onCheckedChange={(checked) =>
                    toggleCondition(condition, checked === true)
                  }
                />
                <span>{condition}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <Label>比較順序</Label>
            {selectedConditions.length === 0 ? (
              <p className="text-xs text-slate-500">請先選擇至少一個製程條件。</p>
            ) : (
              <div className="space-y-1">
                {selectedConditions.map((condition, index) => (
                  <div
                    key={`order-${condition}`}
                    className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm"
                  >
                    <span>
                      {index + 1}. {condition}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => moveCondition(condition, "up")}
                        disabled={index === 0}
                        aria-label={`上移 ${condition}`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => moveCondition(condition, "down")}
                        disabled={index === selectedConditions.length - 1}
                        aria-label={`下移 ${condition}`}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onBaselineConditionChange ? (
            <div className="space-y-1">
              <Label>基準條件</Label>
              <Select
                value={baselineCondition || selectedConditions[0] || undefined}
                onValueChange={onBaselineConditionChange}
                disabled={selectedConditions.length === 0}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="選擇基準條件" />
                </SelectTrigger>
                <SelectContent>
                  {selectedConditions.map((condition) => (
                    <SelectItem key={`baseline-${condition}`} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {onSelectedTrialIndexesChange && trialIndexOptions && selectedTrialIndexes ? (
        <div className="lg:col-span-5">
          <TrialIndexSelector
            options={trialIndexOptions}
            selectedIndexes={selectedTrialIndexes}
            onChange={onSelectedTrialIndexesChange}
          />
        </div>
      ) : null}
    </div>
  );
}
