"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrialIndexSelectorProps = {
  options: number[];
  selectedIndexes: number[];
  onChange: (indexes: number[]) => void;
  label?: string;
};

export function TrialIndexSelector({
  options,
  selectedIndexes,
  onChange,
  label = "單筆量測顯示筆數",
}: TrialIndexSelectorProps) {
  const isAllSelected = selectedIndexes.length === 0;

  const toggleIndex = (indexNo: number) => {
    if (isAllSelected) {
      onChange([indexNo]);
      return;
    }

    if (selectedIndexes.includes(indexNo)) {
      const next = selectedIndexes.filter((item) => item !== indexNo);
      onChange(next.length === 0 ? [] : next);
      return;
    }

    onChange([...selectedIndexes, indexNo].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={isAllSelected ? "default" : "outline"}
          onClick={() => onChange([])}
          className={cn("h-7", isAllSelected ? "bg-slate-900 text-white hover:bg-slate-800" : "")}
        >
          全部
        </Button>
        {options.map((indexNo) => {
          const active = !isAllSelected && selectedIndexes.includes(indexNo);
          return (
            <Button
              key={indexNo}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggleIndex(indexNo)}
              className={cn("h-7", active ? "bg-slate-900 text-white hover:bg-slate-800" : "")}
            >
              第 {indexNo} 筆
            </Button>
          );
        })}
      </div>
    </div>
  );
}

