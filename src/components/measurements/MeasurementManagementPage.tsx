"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BaselineListResponse, MeasurementDatasetListResponse } from "@/lib/api-types";
import type { MeasurementDatasetWithRelations } from "@/lib/types";

import { SectionCard } from "@/components/layout/SectionCard";
import { MeasurementDatasetEditModal } from "@/components/measurements/MeasurementDatasetEditModal";
import { MeasurementDatasetList } from "@/components/measurements/MeasurementDatasetList";
import { MeasurementRecordEditModal } from "@/components/measurements/MeasurementRecordEditModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

type EditingRecordState = {
  datasetId: string;
  recordId: string;
};

export function MeasurementManagementPage() {
  const [datasets, setDatasets] = useState<MeasurementDatasetWithRelations[]>([]);
  const [baselines, setBaselines] = useState<BaselineListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<EditingRecordState | null>(null);

  const loadData = useCallback(
    async (preferredExpandedId?: string | null) => {
      setLoading(true);
      try {
        const [datasetsResponse, baselinesResponse] = await Promise.all([
          fetch("/api/measurements"),
          fetch("/api/baselines"),
        ]);

        if (!datasetsResponse.ok || !baselinesResponse.ok) {
          alert("載入資料失敗，請稍後再試。");
          return;
        }

        const datasetsJson = (await datasetsResponse.json()) as MeasurementDatasetListResponse;
        const baselinesJson = (await baselinesResponse.json()) as BaselineListResponse;

        const nextDatasets = datasetsJson.data;
        setDatasets(nextDatasets);
        setBaselines(baselinesJson.data);

        setExpandedDatasetId((prev) => {
          const candidate = preferredExpandedId ?? prev;
          if (!candidate) {
            return null;
          }
          return nextDatasets.some((dataset) => dataset.id === candidate) ? candidate : null;
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const editingDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === editingDatasetId) ?? null,
    [datasets, editingDatasetId],
  );

  const editingRecordData = useMemo(() => {
    if (!editingRecord) {
      return { datasetId: null, record: null };
    }
    const targetDataset = datasets.find((dataset) => dataset.id === editingRecord.datasetId);
    if (!targetDataset) {
      return { datasetId: null, record: null };
    }
    const record = targetDataset.records.find((item) => item.id === editingRecord.recordId) ?? null;
    return {
      datasetId: targetDataset.id,
      record,
    };
  }, [datasets, editingRecord]);

  const handleDeleteDataset = async (dataset: MeasurementDatasetWithRelations) => {
    const confirmed = confirm("確定刪除此 dataset？此操作會連同明細一併刪除。");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/measurements/${dataset.id}`, { method: "DELETE" });
    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      alert(error.message ?? "刪除 dataset 失敗。");
      return;
    }

    if (editingDatasetId === dataset.id) {
      setEditingDatasetId(null);
    }
    if (editingRecord?.datasetId === dataset.id) {
      setEditingRecord(null);
    }
    await loadData(dataset.id === expandedDatasetId ? null : expandedDatasetId);
  };

  const handleDeleteRecord = async (datasetId: string, recordId: string) => {
    const confirmed = confirm("確定刪除此筆 record？刪除後將自動重排筆數。");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/measurements/records/${recordId}`, { method: "DELETE" });
    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      alert(error.message ?? "刪除 record 失敗。");
      return;
    }

    if (editingRecord?.recordId === recordId) {
      setEditingRecord(null);
    }
    await loadData(datasetId);
  };

  return (
    <>
      <SectionCard title="Dataset 清單">
        <div className="mb-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => void loadData(expandedDatasetId)}>
            重新整理
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">載入中...</p>
        ) : datasets.length === 0 ? (
          <EmptyState title="目前尚無量測資料" description="請先到新增量測資料頁建立 dataset。" />
        ) : (
          <MeasurementDatasetList
            datasets={datasets}
            expandedDatasetId={expandedDatasetId}
            onToggleExpand={(datasetId) =>
              setExpandedDatasetId((prev) => (prev === datasetId ? null : datasetId))
            }
            onEditDataset={(dataset) => setEditingDatasetId(dataset.id)}
            onDeleteDataset={(dataset) => void handleDeleteDataset(dataset)}
            onEditRecord={(datasetId, record) =>
              setEditingRecord({ datasetId, recordId: record.id })
            }
            onDeleteRecord={(datasetId, record) => void handleDeleteRecord(datasetId, record.id)}
          />
        )}
      </SectionCard>

      <MeasurementDatasetEditModal
        dataset={editingDataset}
        baselines={baselines}
        onClose={() => setEditingDatasetId(null)}
        onSaved={(datasetId) => loadData(datasetId)}
      />

      <MeasurementRecordEditModal
        datasetId={editingRecordData.datasetId}
        record={editingRecordData.record}
        onClose={() => setEditingRecord(null)}
        onSaved={(datasetId) => loadData(datasetId)}
      />
    </>
  );
}
