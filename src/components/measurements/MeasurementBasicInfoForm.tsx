"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MeasurementBasicInfo = {
  datasetName: string;
  conditionLabel: string;
};

type MeasurementBasicInfoFormProps = {
  value: MeasurementBasicInfo;
  onChange: (value: MeasurementBasicInfo) => void;
};

export function MeasurementBasicInfoForm({
  value,
  onChange,
}: MeasurementBasicInfoFormProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="datasetName">資料名稱</Label>
        <Input
          id="datasetName"
          value={value.datasetName}
          onChange={(event) => onChange({ ...value, datasetName: event.target.value })}
          placeholder="例如：石墨晶舟批次 A"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="conditionLabel">製程條件</Label>
        <Input
          id="conditionLabel"
          value={value.conditionLabel}
          onChange={(event) => onChange({ ...value, conditionLabel: event.target.value })}
          placeholder="例如：300°C 製程後"
        />
      </div>
    </div>
  );
}
