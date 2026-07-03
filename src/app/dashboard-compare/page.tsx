"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import type { BaselineListResponse, MeasurementDatasetListResponse } from "@/lib/api-types";
import {
  buildDatasetCompareRows,
  buildDatasetRangeRows,
  buildSampleTargetCode,
  normalizeTargetSource,
  type DatasetCompareRangeRow,
  type DatasetCompareRow,
  type DatasetCompareTarget,
} from "@/lib/dataset-compare";
import type { BaselineProfile, MeasurementDatasetWithRelations } from "@/lib/types";

import { DatasetCompareCharts } from "@/components/dashboard-compare/DatasetCompareCharts";
import { DatasetCompareControlPanel } from "@/components/dashboard-compare/DatasetCompareControlPanel";
import { DatasetCompareRangeCharts } from "@/components/dashboard-compare/DatasetCompareRangeCharts";
import { DatasetCompareSummary } from "@/components/dashboard-compare/DatasetCompareSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useAppSettings } from "@/components/settings/SettingsProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatCapacitanceByMode,
  formatFrequencyByMode,
  formatLevelByMode,
  formatResistanceByMode,
} from "@/lib/unit-conversion";
import {
  buildExportFilename,
  captureExportChartPng,
  createZipBlob,
  downloadFile,
  downloadTextFile,
  escapeCsvValue,
  getExportDateStamp,
  type ExportChartFile,
} from "@/lib/dashboard-export";

const DASHBOARD_COMPARE_STORAGE_KEY = "lcr.dashboard-compare.v1";

type DashboardCompareStoredSettings = {
  targets: DatasetCompareTarget[];
  useBaselineAsC1: boolean;
  selectedBaselineId: string;
};

const CSV_HEADERS = [
  "比較樣本",
  "Dataset Name",
  "Condition Label",
  "資料來源",
  "FREQ",
  "LEVEL",
  "Rp",
  "Cp",
  "Rs",
  "Cs",
  "Records Count",
  "缺值提示",
] as const;

const SCALE_EXPORT_CHARTS = [
  { key: "scale-rp", filename: "scale-rp.png" },
  { key: "scale-cp", filename: "scale-cp.png" },
  { key: "scale-rs", filename: "scale-rs.png" },
  { key: "scale-cs", filename: "scale-cs.png" },
] as const;

function formatCsvFrequency(row: DatasetCompareRow, displayMode: "standard" | "friendly") {
  if (row.source === "average") {
    return "全部平均";
  }
  return formatFrequencyByMode(row.freqHz, displayMode);
}

function buildCompareRowsCsv(rows: DatasetCompareRow[], displayMode: "standard" | "friendly") {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.targetCode,
        row.datasetName,
        row.conditionLabel,
        row.sourceLabel,
        formatCsvFrequency(row, displayMode),
        formatLevelByMode(row.level, displayMode),
        formatResistanceByMode(row.values.rp, displayMode),
        formatCapacitanceByMode(row.values.cp, displayMode),
        formatResistanceByMode(row.values.rs, displayMode),
        formatCapacitanceByMode(row.values.cs, displayMode),
        row.recordCount,
        renderMissingMessages(row.missingMessages),
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}

function renderMissingMessages(messages: string[]) {
  return messages.length > 0 ? messages.join("；") : "--";
}

async function downloadExportChartAsPng(
  container: HTMLElement | null,
  chartKey: string,
  filenamePrefix: string,
) {
  try {
    const blob = await captureExportChartPng(container, chartKey);
    if (!blob) {
      window.alert("目前找不到可匯出的圖表，請確認圖表已載入完成。");
      return;
    }
    downloadFile(blob, buildExportFilename(filenamePrefix, "png"));
  } catch (error) {
    console.error(error);
    window.alert("圖表 PNG 匯出失敗，請重新整理頁面後再試一次。");
  }
}

async function downloadScaleChartsZip(container: HTMLElement | null) {
  const missingCharts: string[] = [];
  const files: ExportChartFile[] = [];

  for (const chart of SCALE_EXPORT_CHARTS) {
    try {
      const blob = await captureExportChartPng(container, chart.key);
      if (blob) {
        files.push({ filename: chart.filename, blob });
      } else {
        missingCharts.push(chart.filename);
      }
    } catch (error) {
      console.error(error);
      missingCharts.push(chart.filename);
    }
  }

  if (files.length === 0) {
    window.alert("目前找不到可匯出的 Scale Bar 圖表，請確認圖表已載入完成。");
    return;
  }

  const zipBlob = await createZipBlob(files);
  downloadFile(zipBlob, buildExportFilename("scale-charts", "zip"));

  if (missingCharts.length > 0) {
    window.alert(`部分 Scale Bar 圖表尚未載入或找不到：${missingCharts.join("、")}`);
  }
}

function parseCompareTargetNumber(targetId: string): number | null {
  const match = /^compare-target-(\d+)$/.exec(targetId);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseStoredDashboardCompareSettings(raw: string): DashboardCompareStoredSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardCompareStoredSettings> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const parsedTargets = Array.isArray(parsed.targets)
      ? parsed.targets
          .filter(
            (item): item is DatasetCompareTarget =>
              typeof item === "object" &&
              item !== null &&
              typeof item.id === "string" &&
              item.id.trim().length > 0 &&
              typeof item.datasetId === "string" &&
              item.datasetId.trim().length > 0 &&
              typeof item.source === "string",
          )
          .map((item) => ({
            id: item.id,
            datasetId: item.datasetId,
            source: item.source,
          }))
      : [];

    return {
      targets: parsedTargets,
      useBaselineAsC1: parsed.useBaselineAsC1 === true,
      selectedBaselineId:
        typeof parsed.selectedBaselineId === "string" ? parsed.selectedBaselineId : "",
    };
  } catch {
    return null;
  }
}

export default function DatasetCompareDashboardPage() {
  const { settings } = useAppSettings();
  const [datasets, setDatasets] = useState<MeasurementDatasetWithRelations[]>([]);
  const [baselines, setBaselines] = useState<BaselineProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<DatasetCompareTarget[]>([]);
  const [useBaselineAsC1, setUseBaselineAsC1] = useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [reportExportedAt, setReportExportedAt] = useState<string | null>(null);
  const [showRangeDetails, setShowRangeDetails] = useState(false);
  const targetCounterRef = useRef(1);
  const compareChartRef = useRef<HTMLDivElement>(null);
  const rangeChartRef = useRef<HTMLDivElement>(null);

  const syncCounterWithTargetId = useCallback((targetId: string) => {
    const parsed = parseCompareTargetNumber(targetId);
    if (parsed === null) {
      return;
    }
    targetCounterRef.current = Math.max(targetCounterRef.current, parsed + 1);
  }, []);

  const getNextTargetId = useCallback((usedIds?: Set<string>) => {
    let nextId = `compare-target-${targetCounterRef.current++}`;
    while (usedIds?.has(nextId)) {
      nextId = `compare-target-${targetCounterRef.current++}`;
    }
    if (usedIds) {
      usedIds.add(nextId);
    }
    return nextId;
  }, []);

  const createTarget = useCallback(
    (datasetId: string, usedIds?: Set<string>): DatasetCompareTarget => ({
      id: getNextTargetId(usedIds),
      datasetId,
      source: "average",
    }),
    [getNextTargetId],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(DASHBOARD_COMPARE_STORAGE_KEY);
    if (!raw) {
      setStorageReady(true);
      return;
    }
    const parsed = parseStoredDashboardCompareSettings(raw);
    if (parsed) {
      const usedIds = new Set<string>();
      const dedupedTargets = parsed.targets.map((target) => {
        const rawId = target.id.trim();
        if (!rawId || usedIds.has(rawId)) {
          return {
            ...target,
            id: getNextTargetId(usedIds),
          };
        }
        usedIds.add(rawId);
        syncCounterWithTargetId(rawId);
        return {
          ...target,
          id: rawId,
        };
      });

      setTargets(dedupedTargets);
      setUseBaselineAsC1(parsed.useBaselineAsC1);
      setSelectedBaselineId(parsed.selectedBaselineId);
    }
    setStorageReady(true);
  }, [getNextTargetId, syncCounterWithTargetId]);

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      try {
        const [datasetsResponse, baselinesResponse] = await Promise.all([
          fetch("/api/measurements"),
          fetch("/api/baselines"),
        ]);
        const datasetsJson = (await datasetsResponse.json()) as MeasurementDatasetListResponse;
        const baselinesJson = (await baselinesResponse.json()) as BaselineListResponse;
        setDatasets(datasetsJson.data);
        setBaselines(baselinesJson.data);
      } finally {
        setLoading(false);
      }
    };

    void fetchDatasets();
  }, []);

  useEffect(() => {
    if (datasets.length === 0) {
      return;
    }

    setTargets((prev) => {
      const fallbackDatasetId = datasets[0].id;
      const secondDatasetId = datasets[1]?.id ?? fallbackDatasetId;
      const usedIds = new Set<string>();

      if (prev.length === 0) {
        return [createTarget(fallbackDatasetId, usedIds), createTarget(secondDatasetId, usedIds)];
      }

      const validTargets = prev.filter((target) =>
        datasets.some((dataset) => dataset.id === target.datasetId),
      );

      const normalizedTargets = validTargets.map((target) => {
        const nextDataset = datasets.find((item) => item.id === target.datasetId) ?? null;
        const rawId = target.id.trim();
        let nextId = rawId;
        if (!nextId || usedIds.has(nextId)) {
          nextId = getNextTargetId(usedIds);
        } else {
          usedIds.add(nextId);
          syncCounterWithTargetId(nextId);
        }
        return {
          ...target,
          id: nextId,
          datasetId: target.datasetId,
          source: normalizeTargetSource(nextDataset, target.source),
        };
      });

      while (normalizedTargets.length < 2) {
        normalizedTargets.push(
          createTarget(normalizedTargets.length === 0 ? fallbackDatasetId : secondDatasetId, usedIds),
        );
      }

      return normalizedTargets;
    });
  }, [datasets, createTarget, getNextTargetId, syncCounterWithTargetId]);

  useEffect(() => {
    if (!selectedBaselineId) {
      return;
    }
    if (!baselines.some((baseline) => baseline.id === selectedBaselineId)) {
      setSelectedBaselineId("");
    }
  }, [baselines, selectedBaselineId]);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") {
      return;
    }
    const payload: DashboardCompareStoredSettings = {
      targets,
      useBaselineAsC1,
      selectedBaselineId,
    };
    window.localStorage.setItem(DASHBOARD_COMPARE_STORAGE_KEY, JSON.stringify(payload));
  }, [storageReady, targets, useBaselineAsC1, selectedBaselineId]);

  const rawCompareRows = useMemo(
    () => buildDatasetCompareRows(datasets, targets),
    [datasets, targets],
  );
  const rawRangeRows = useMemo(
    () => buildDatasetRangeRows(datasets, targets),
    [datasets, targets],
  );

  const selectedBaseline = useMemo(
    () => (selectedBaselineId ? baselines.find((baseline) => baseline.id === selectedBaselineId) ?? null : null),
    [baselines, selectedBaselineId],
  );

  const baselineC1Warning = useMemo(() => {
    if (!useBaselineAsC1) {
      return null;
    }
    if (!selectedBaselineId || !selectedBaseline) {
      return "請選擇 baseline";
    }
    return null;
  }, [useBaselineAsC1, selectedBaseline, selectedBaselineId]);

  const syntheticBaselineCompareRow = useMemo<DatasetCompareRow | null>(() => {
    if (!useBaselineAsC1 || !selectedBaseline) {
      return null;
    }
    const baseline = selectedBaseline;
    const values = {
      rp: baseline.rp ?? null,
      cp: baseline.cp ?? null,
      rs: baseline.rs ?? null,
      cs: baseline.cs ?? null,
    };
    const missingMessages = (["rp", "cp", "rs", "cs"] as const)
      .filter((parameter) => values[parameter] === null)
      .map((parameter) => `${parameter.toUpperCase()} 缺少 baseline 數值`);

    return {
      targetCode: buildSampleTargetCode(0),
      targetId: `baseline-${baseline.id}`,
      datasetId: baseline.id,
      datasetName: `Baseline：${baseline.name}`,
      conditionLabel: baseline.conditionLabel || "Baseline",
      source: "average",
      sourceLabel: "Baseline",
      freqHz: baseline.freqHz ?? null,
      level: baseline.level ?? null,
      values,
      recordCount: 0,
      missingMessages,
    };
  }, [selectedBaseline, useBaselineAsC1]);

  const syntheticBaselineRangeRow = useMemo<DatasetCompareRangeRow | null>(() => {
    if (!useBaselineAsC1 || !selectedBaseline) {
      return null;
    }
    const baseline = selectedBaseline;
    const values = {
      rp: baseline.rp ?? null,
      cp: baseline.cp ?? null,
      rs: baseline.rs ?? null,
      cs: baseline.cs ?? null,
    };
    const missingMessages = (["rp", "cp", "rs", "cs"] as const)
      .filter((parameter) => values[parameter] === null)
      .map((parameter) => `${parameter.toUpperCase()} 缺少 baseline 數值`);

    return {
      targetCode: buildSampleTargetCode(0),
      targetId: `baseline-range-${baseline.id}`,
      datasetId: baseline.id,
      datasetName: `Baseline：${baseline.name}`,
      conditionLabel: baseline.conditionLabel || "Baseline",
      source: "average",
      sourceLabel: "Baseline",
      freqHz: baseline.freqHz ?? null,
      level: baseline.level ?? null,
      recordCount: 0,
      ranges: {
        rp: { min: values.rp, mean: values.rp, max: values.rp },
        cp: { min: values.cp, mean: values.cp, max: values.cp },
        rs: { min: values.rs, mean: values.rs, max: values.rs },
        cs: { min: values.cs, mean: values.cs, max: values.cs },
      },
      missingMessages,
    };
  }, [selectedBaseline, useBaselineAsC1]);

  const compareRows = useMemo(() => {
    if (!syntheticBaselineCompareRow) {
      return rawCompareRows;
    }
    const shiftedRows = rawCompareRows.map((row, index) => ({
      ...row,
      targetCode: buildSampleTargetCode(index + 1),
    }));
    return [syntheticBaselineCompareRow, ...shiftedRows];
  }, [rawCompareRows, syntheticBaselineCompareRow]);

  const rangeRows = useMemo(() => {
    if (!syntheticBaselineRangeRow) {
      return rawRangeRows;
    }
    const shiftedRows = rawRangeRows.map((row, index) => ({
      ...row,
      targetCode: buildSampleTargetCode(index + 1),
    }));
    return [syntheticBaselineRangeRow, ...shiftedRows];
  }, [rawRangeRows, syntheticBaselineRangeRow]);

  const handleAddTarget = () => {
    if (datasets.length === 0) {
      return;
    }
    setTargets((prev) => [...prev, createTarget(datasets[0].id)]);
  };

  const handleDownloadReportPdf = () => {
    const now = new Date();
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    setReportExportedAt(now.toISOString());
    document.title = `compare-report-${getExportDateStamp(now)}`;
    window.addEventListener("afterprint", restoreTitle);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(restoreTitle, 1000);
    }, 50);
  };

  const handleDownloadCompareCsv = () => {
    downloadTextFile(
      `\uFEFF${buildCompareRowsCsv(compareRows, settings.displayMode)}`,
      buildExportFilename("compare-table", "csv"),
      "text/csv;charset=utf-8",
    );
  };

  const reportExportTimeText = reportExportedAt
    ? new Date(reportExportedAt).toLocaleString("zh-TW")
    : new Date().toLocaleString("zh-TW");
  const reportTargetNames = compareRows
    .map((row) => `${row.targetCode}: ${row.datasetName}`)
    .join("、");
  const reportSourceSummary = [...new Set(compareRows.map((row) => row.sourceLabel))].join(" / ");
  const reportBaselineName = selectedBaseline ? selectedBaseline.name : "未使用";

  return (
    <div>
      {!loading && datasets.length > 0 ? (
        <div className="report-print-only">
          <section className="report-page report-section">
            <h1 className="text-xl font-bold text-slate-900">LCR 比較報告</h1>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              <p>匯出時間：{reportExportTimeText}</p>
              <p>Dashboard 名稱：量測分析 Dashboard</p>
              <p>比較樣本數：{compareRows.length}</p>
              <p>比較對象：{reportTargetNames || "--"}</p>
            </div>

            <div className="report-section mt-3 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="mb-2 font-semibold text-slate-900">比較資訊摘要</p>
              <div className="grid gap-1 sm:grid-cols-2">
                <p>比較樣本：{compareRows.length} 組</p>
                <p>Baseline：{reportBaselineName}</p>
                <p>資料來源：{reportSourceSummary || "--"}</p>
                <p>匯出時間：{reportExportTimeText}</p>
              </div>
            </div>

            <div className="report-section mt-3 rounded-md border border-slate-300 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">比較資料表</p>
              <div className="overflow-auto rounded-md border border-slate-300 bg-white">
                <Table className="min-w-[1120px] text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>比較樣本</TableHead>
                      <TableHead>Dataset Name</TableHead>
                      <TableHead>Condition Label</TableHead>
                      <TableHead>資料來源</TableHead>
                      <TableHead>FREQ</TableHead>
                      <TableHead>LEVEL</TableHead>
                      <TableHead>Rp</TableHead>
                      <TableHead>Cp</TableHead>
                      <TableHead>Rs</TableHead>
                      <TableHead>Cs</TableHead>
                      <TableHead>Records Count</TableHead>
                      <TableHead>缺值提示</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareRows.map((row) => (
                      <TableRow key={`print-target-${row.targetId}`}>
                        <TableCell>{row.targetCode}</TableCell>
                        <TableCell>{row.datasetName}</TableCell>
                        <TableCell>{row.conditionLabel}</TableCell>
                        <TableCell>{row.sourceLabel}</TableCell>
                        <TableCell className="font-mono">{formatFrequencyByMode(row.freqHz, settings.displayMode)}</TableCell>
                        <TableCell className="font-mono">{formatLevelByMode(row.level, settings.displayMode)}</TableCell>
                        <TableCell className="font-mono">{formatResistanceByMode(row.values.rp, settings.displayMode)}</TableCell>
                        <TableCell className="font-mono">{formatCapacitanceByMode(row.values.cp, settings.displayMode)}</TableCell>
                        <TableCell className="font-mono">{formatResistanceByMode(row.values.rs, settings.displayMode)}</TableCell>
                        <TableCell className="font-mono">{formatCapacitanceByMode(row.values.cs, settings.displayMode)}</TableCell>
                        <TableCell>{row.recordCount}</TableCell>
                        <TableCell>{renderMissingMessages(row.missingMessages)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          <section className="report-page report-page-break report-chart-section report-section">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">多資料比較圖（Parallel Coordinates）</h2>
            <DatasetCompareCharts rows={compareRows} reportMode />
          </section>

          <section className="report-page report-page-break report-chart-section report-section report-allow-break">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">單一參數比較（Scale Bar）</h2>
            <DatasetCompareRangeCharts rows={rangeRows} />
          </section>
        </div>
      ) : null}

      <div className="report-no-print">
        <PageHeader title="量測分析 Dashboard" description="比較多組 dataset 的平均量測結果。" />

        <SectionCard title="選擇比較樣本">
          <DatasetCompareControlPanel
            datasets={datasets}
            targets={targets}
            onTargetsChange={setTargets}
            onAddTarget={handleAddTarget}
            useBaselineAsC1={useBaselineAsC1}
            onUseBaselineAsC1Change={setUseBaselineAsC1}
            baselines={baselines}
            selectedBaselineId={selectedBaselineId}
            onSelectedBaselineIdChange={setSelectedBaselineId}
            baselineWarning={baselineC1Warning}
          />
        </SectionCard>

        {loading ? (
          <p className="text-sm text-slate-500">載入中...</p>
        ) : datasets.length === 0 ? (
          <EmptyState title="目前尚無 dataset" description="請先到新增量測資料頁建立資料。" />
        ) : (
          <>
            <SectionCard
              title="多資料比較圖"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadExportChartAsPng(compareChartRef.current, "compare-overview", "compare-overview")
                  }
                >
                  <Download data-icon="inline-start" />
                  下載 PNG
                </Button>
              }
            >
              <div ref={compareChartRef}>
                <DatasetCompareCharts rows={compareRows} />
              </div>
            </SectionCard>

            <SectionCard
              title="單一參數比較（Scale Bar）"
              action={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadScaleChartsZip(rangeChartRef.current)}
                  >
                    <Download data-icon="inline-start" />
                    下載 ZIP
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRangeDetails((prev) => !prev)}
                  >
                    {showRangeDetails ? "隱藏詳細資訊" : "顯示詳細資訊"}
                  </Button>
                </>
              }
            >
              <div ref={rangeChartRef}>
                <DatasetCompareRangeCharts rows={rangeRows} showDetails={showRangeDetails} />
              </div>
            </SectionCard>

            <SectionCard title="比較資料表">
              <DatasetCompareSummary rows={compareRows} />
            </SectionCard>

            <SectionCard title="匯出比較報告">
              <p className="text-sm text-slate-700">
                PDF 是主要交付報告；CSV 可下載比較資料表並用於 Excel 分析。圖表可在各圖表區塊旁下載。
              </p>
              <p className="mt-1 text-xs text-slate-500">
                報告包含標題、匯出時間、比較對象、比較資料表、多資料比較圖與 Rp / Cp / Rs / Cs Scale Bar。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="lg" onClick={handleDownloadReportPdf} className="report-no-print">
                  <Download data-icon="inline-start" />
                  下載比較報告 PDF
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={handleDownloadCompareCsv}>
                  <FileSpreadsheet data-icon="inline-start" />
                  下載比較表 CSV
                </Button>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
