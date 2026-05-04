"use client";

import { useEffect, useState } from "react";

import type { UpdateMeasurementDatasetPayload } from "@/lib/api-types";
import type { BaselineProfile, MeasurementDatasetWithRelations } from "@/lib/types";

import { BaselineSelector } from "@/components/baselines/BaselineSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MeasurementDatasetEditModalProps = {
  dataset: MeasurementDatasetWithRelations | null;
  baselines: BaselineProfile[];
  onClose: () => void;
  onSaved: (datasetId: string) => Promise<void> | void;
};

export function MeasurementDatasetEditModal({
  dataset,
  baselines,
  onClose,
  onSaved,
}: MeasurementDatasetEditModalProps) {
  const [datasetName, setDatasetName] = useState("");
  const [conditionLabel, setConditionLabel] = useState("");
  const [baselineId, setBaselineId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dataset) {
      return;
    }
    setDatasetName(dataset.datasetName);
    setConditionLabel(dataset.conditionLabel);
    setBaselineId(dataset.baselineId ?? "");
    setNote(dataset.note ?? "");
  }, [dataset]);

  if (!dataset) {
    return null;
  }

  const save = async () => {
    if (!datasetName.trim()) {
      alert("資料名稱不可為空白。");
      return;
    }
    if (!conditionLabel.trim()) {
      alert("製程條件不可為空白。");
      return;
    }

    const payload: UpdateMeasurementDatasetPayload = {
      datasetName: datasetName.trim(),
      conditionLabel: conditionLabel.trim(),
      baselineId: baselineId || null,
      note: note.trim() || null,
    };

    setSaving(true);
    try {
      const response = await fetch(`/api/measurements/${dataset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        alert(error.message ?? "更新 dataset 失敗。");
        return;
      }

      await onSaved(dataset.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">編輯 Dataset</h3>
          <p className="text-xs text-slate-500">第 1 層資料資訊編輯，不會直接改動明細內容。</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">資料名稱</p>
            <Input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">製程條件</p>
            <Input value={conditionLabel} onChange={(event) => setConditionLabel(event.target.value)} />
          </div>

          <BaselineSelector
            label="Baseline 綁定"
            value={baselineId}
            baselines={baselines}
            emptyLabel="不指定 baseline"
            onChange={setBaselineId}
          />

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">備註</p>
            <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

