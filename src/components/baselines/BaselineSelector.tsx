import type { BaselineProfile } from "@/lib/types";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BaselineSelectorProps = {
  label?: string;
  value: string;
  baselines: BaselineProfile[];
  placeholder?: string;
  includeEmpty?: boolean;
  emptyLabel?: string;
  onChange: (value: string) => void;
};

export function BaselineSelector({
  label = "Baseline",
  value,
  baselines,
  placeholder = "選擇 baseline",
  includeEmpty = true,
  emptyLabel = "不指定 baseline",
  onChange,
}: BaselineSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "__none__"} onValueChange={(next) => onChange(next === "__none__" ? "" : next)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeEmpty ? <SelectItem value="__none__">{emptyLabel}</SelectItem> : null}
          {baselines.map((baseline) => (
            <SelectItem key={baseline.id} value={baseline.id}>
              {baseline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
