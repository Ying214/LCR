"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MeasurementDatasetListResponse } from "@/lib/api-types";
import {
  buildDatasetCompareRows,
  buildDatasetRangeRows,
  normalizeTargetSource,
  type DatasetCompareTarget,
} from "@/lib/dataset-compare";
import type { MeasurementDatasetWithRelations } from "@/lib/types";

import { DatasetCompareCharts } from "@/components/dashboard-compare/DatasetCompareCharts";
import { DatasetCompareControlPanel } from "@/components/dashboard-compare/DatasetCompareControlPanel";
import { DatasetCompareRangeCharts } from "@/components/dashboard-compare/DatasetCompareRangeCharts";
import { DatasetCompareSummary } from "@/components/dashboard-compare/DatasetCompareSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DatasetCompareDashboardPage() {
  const [datasets, setDatasets] = useState<MeasurementDatasetWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<DatasetCompareTarget[]>([]);
  const [reportExportedAt, setReportExportedAt] = useState<string | null>(null);
  const targetCounterRef = useRef(1);

  const createTarget = useCallback(
    (datasetId: string): DatasetCompareTarget => ({
      id: `compare-target-${targetCounterRef.current++}`,
      datasetId,
      source: "average",
    }),
    [],
  );

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/measurements");
        const json = (await response.json()) as MeasurementDatasetListResponse;
        setDatasets(json.data);
      } finally {
        setLoading(false);
      }
    };

    void fetchDatasets();
  }, []);

  useEffect(() => {
    if (datasets.length === 0) {
      setTargets([]);
      return;
    }

    setTargets((prev) => {
      const fallbackDatasetId = datasets[0].id;
      const secondDatasetId = datasets[1]?.id ?? fallbackDatasetId;

      if (prev.length === 0) {
        return [createTarget(fallbackDatasetId), createTarget(secondDatasetId)];
      }

      const normalizedTargets = prev.map((target) => {
        const dataset = datasets.find((item) => item.id === target.datasetId) ?? null;
        const nextDatasetId = dataset?.id ?? fallbackDatasetId;
        const nextDataset = datasets.find((item) => item.id === nextDatasetId) ?? null;
        return {
          ...target,
          datasetId: nextDatasetId,
          source: normalizeTargetSource(nextDataset, target.source),
        };
      });

      while (normalizedTargets.length < 2) {
        normalizedTargets.push(createTarget(normalizedTargets.length === 0 ? fallbackDatasetId : secondDatasetId));
      }

      return normalizedTargets;
    });
  }, [datasets, createTarget]);

  const compareRows = useMemo(
    () => buildDatasetCompareRows(datasets, targets),
    [datasets, targets],
  );
  const rangeRows = useMemo(
    () => buildDatasetRangeRows(datasets, targets),
    [datasets, targets],
  );

  const handleAddTarget = () => {
    if (datasets.length === 0) {
      return;
    }
    setTargets((prev) => [...prev, createTarget(datasets[0].id)]);
  };

  const handleDownloadReportPdf = () => {
    const now = new Date().toISOString();
    setReportExportedAt(now);
    window.setTimeout(() => {
      window.print();
    }, 50);
  };

  const reportExportTimeText = reportExportedAt
    ? new Date(reportExportedAt).toLocaleString("zh-TW")
    : new Date().toLocaleString("zh-TW");

  return (
    <div>
      {!loading && datasets.length > 0 ? (
        <div className="report-print-only">
          <section className="report-page report-section">
            <h1 className="text-xl font-bold text-slate-900">石墨晶舟量測資料比較報告</h1>
            <p className="mt-1 text-sm text-slate-700">匯出時間：{reportExportTimeText}</p>

            <div className="report-section mt-3 rounded-md border border-slate-300 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">比較對象清單</p>
              <div className="overflow-auto rounded-md border border-slate-300 bg-white">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>比較對象</TableHead>
                      <TableHead>Dataset Name</TableHead>
                      <TableHead>Condition Label</TableHead>
                      <TableHead>資料來源</TableHead>
                      <TableHead>Records Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareRows.map((row) => (
                      <TableRow key={`print-target-${row.targetId}`}>
                        <TableCell>{row.targetCode}</TableCell>
                        <TableCell>{row.datasetName}</TableCell>
                        <TableCell>{row.conditionLabel}</TableCell>
                        <TableCell>{row.sourceLabel}</TableCell>
                        <TableCell>{row.recordCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="report-section mt-4 rounded-md border border-slate-300 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">比較資料表</p>
              <DatasetCompareSummary rows={compareRows} />
            </div>

          </section>

          <section className="report-page report-page-break report-chart-section report-section">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">多資料比較圖</h2>
            <DatasetCompareCharts rows={compareRows} />
          </section>

          <section className="report-page report-page-break report-chart-section report-section report-allow-break">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">單一參數比較（Scale Bar）</h2>
            <DatasetCompareRangeCharts rows={rangeRows} />
          </section>
        </div>
      ) : null}

      <div className="report-no-print">
        <PageHeader title="量測分析 Dashboard" description="比較多組 dataset 的平均量測結果。" />

        <SectionCard title="選擇比較對象">
          <DatasetCompareControlPanel
            datasets={datasets}
            targets={targets}
            onTargetsChange={setTargets}
            onAddTarget={handleAddTarget}
          />
        </SectionCard>

        {loading ? (
          <p className="text-sm text-slate-500">載入中...</p>
        ) : datasets.length === 0 ? (
          <EmptyState title="目前尚無 dataset" description="請先到新增量測資料頁建立資料。" />
        ) : (
          <>
            <SectionCard title="多資料比較圖">
              <DatasetCompareCharts rows={compareRows} />
            </SectionCard>

            <SectionCard title="單一參數比較（Scale Bar）">
              <DatasetCompareRangeCharts rows={rangeRows} />
            </SectionCard>

            <SectionCard title="比較資料表">
              <DatasetCompareSummary rows={compareRows} />
            </SectionCard>

            <SectionCard title="下載比較資料">
              <p className="text-sm text-slate-700">
                下載目前比較結果報告。按下後會開啟列印視窗，請選擇「另存為 PDF」輸出 A4 直式報告。
              </p>
              <p className="mt-1 text-xs text-slate-500">報告包含標題、匯出時間、比較對象清單、比較資料表、多資料比較圖、圖例與單一參數比較圖。</p>
              <div className="mt-3">
                <Button type="button" onClick={handleDownloadReportPdf} className="report-no-print">
                  下載比較報告 PDF
                </Button>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
