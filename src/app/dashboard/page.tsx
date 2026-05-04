"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  BaselineListResponse,
  MeasurementDatasetListResponse,
  MeasurementFilterOptionsResponse,
} from "@/lib/api-types";
import { DEFAULT_MEASUREMENT_FILTER } from "@/lib/constants";
import type {
  ComparisonMode,
  MeasurementDatasetWithRelations,
  MeasurementFilterOptions,
  ParameterKey,
  TrendRecordSelection,
} from "@/lib/types";
import { useMeasurementFilters } from "@/hooks/useMeasurementFilters";
import { useMeasurementSummary } from "@/hooks/useMeasurementSummary";

import { BaselineComparisonChart } from "@/components/dashboard/BaselineComparisonChart";
import { BaselineComparisonTable } from "@/components/dashboard/BaselineComparisonTable";
import { ChartControlPanel } from "@/components/dashboard/ChartControlPanel";
import { ConditionComparisonChart } from "@/components/dashboard/ConditionComparisonChart";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { SingleParameterTrendChart } from "@/components/dashboard/SingleParameterTrendChart";
import { TrendOverviewMultiAxisChart } from "@/components/dashboard/TrendOverviewMultiAxisChart";
import { TrendSectionHeader } from "@/components/dashboard/TrendSectionHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { MeasurementDataTable } from "@/components/measurements/MeasurementDataTable";
import { MeasurementFilterBar } from "@/components/measurements/MeasurementFilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<MeasurementDatasetWithRelations[]>([]);
  const [baselines, setBaselines] = useState<BaselineListResponse["data"]>([]);
  const [filterOptions, setFilterOptions] = useState<MeasurementFilterOptions>({
    conditionLabels: [],
    frequencies: [],
    levels: [],
  });
  const [loading, setLoading] = useState(true);
  const { draftFilters, appliedFilters, setDraftFilters, applyFilters, resetFilters, toSearchParams } =
    useMeasurementFilters();

  const [trendOverviewControl, setTrendOverviewControl] = useState({
    showAverage: true,
    showBaseline: true,
  });
  const [singleTrendControl, setSingleTrendControl] = useState({
    showAverage: true,
    showBaseline: true,
  });
  const [singleTrendParameter, setSingleTrendParameter] = useState<ParameterKey>("rp");
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [singleCollapsed, setSingleCollapsed] = useState(false);
  const [selectedTrendRecord, setSelectedTrendRecord] = useState<TrendRecordSelection | null>(null);
  const [selectedTrendDatasetId, setSelectedTrendDatasetId] = useState("");
  const [selectedTrialIndexes, setSelectedTrialIndexes] = useState<number[]>([]);
  const [baselineControl, setBaselineControl] = useState({
    parameter: "rp" as ParameterKey,
    showAverage: true,
    showBaseline: true,
    showTrials: true,
  });
  const [conditionControl, setConditionControl] = useState({
    parameter: "rp" as ParameterKey,
    compareMode: "average" as ComparisonMode,
    showBaseline: true,
    selectedConditions: [] as string[],
    baselineCondition: "",
  });

  const fetchDatasets = useCallback(
    async (filters = DEFAULT_MEASUREMENT_FILTER) => {
      setLoading(true);
      try {
        const params = toSearchParams(filters);
        const response = await fetch(`/api/measurements?${params.toString()}`);
        const json = (await response.json()) as MeasurementDatasetListResponse;
        setDatasets(json.data);
      } finally {
        setLoading(false);
      }
    },
    [toSearchParams],
  );

  const fetchBaselines = useCallback(async () => {
    const response = await fetch("/api/baselines");
    const json = (await response.json()) as BaselineListResponse;
    setBaselines(json.data);
  }, []);

  const fetchOptions = useCallback(async () => {
    const response = await fetch("/api/measurements/options");
    if (!response.ok) {
      return;
    }
    const json = (await response.json()) as MeasurementFilterOptionsResponse;
    setFilterOptions(json.data);
  }, []);

  useEffect(() => {
    void fetchBaselines();
    void fetchOptions();
    void fetchDatasets(DEFAULT_MEASUREMENT_FILTER);
  }, [fetchBaselines, fetchDatasets, fetchOptions]);

  useEffect(() => {
    if (!selectedTrendRecord) {
      return;
    }

    const exists = datasets.some(
      (dataset) =>
        dataset.id === selectedTrendRecord.datasetId &&
        dataset.records.some((record) => record.indexNo === selectedTrendRecord.indexNo),
    );

    if (!exists) {
      setSelectedTrendRecord(null);
    }
  }, [datasets, selectedTrendRecord]);

  const summary = useMeasurementSummary(datasets, appliedFilters);
  const hasSelectedFreqAndLevel = Boolean(appliedFilters.freqHz) && Boolean(appliedFilters.level);

  const canShowBaselineComparison = useMemo(() => {
    return (
      datasets.length === 1 &&
      datasets[0].baseline !== null &&
      hasSelectedFreqAndLevel
    );
  }, [datasets, hasSelectedFreqAndLevel]);

  const baselineComparisonMessage = useMemo(() => {
    if (!hasSelectedFreqAndLevel) {
      return "請先在上方查詢列指定單一 FREQ(Hz) 與 LEVEL。";
    }
    if (datasets.length !== 1) {
      return "Baseline 對照僅支援單一 dataset。";
    }
    if (datasets[0].baseline === null) {
      return "目前 dataset 未綁定 baseline，無法進行對照。";
    }
    return "";
  }, [datasets, hasSelectedFreqAndLevel]);

  const conditionOptions = useMemo(() => {
    return [...new Set(datasets.map((dataset) => dataset.conditionLabel))].sort();
  }, [datasets]);

  const totalRecordCount = useMemo(
    () => datasets.reduce((sum, dataset) => sum + dataset.records.length, 0),
    [datasets],
  );
  const trendDataset = useMemo(() => {
    if (datasets.length === 0) {
      return null;
    }
    return datasets.find((dataset) => dataset.id === selectedTrendDatasetId) ?? datasets[0];
  }, [datasets, selectedTrendDatasetId]);
  const trialIndexOptions = useMemo(
    () =>
      trendDataset
        ? [...new Set(trendDataset.records.map((record) => record.indexNo))].sort((a, b) => a - b)
        : [],
    [trendDataset],
  );

  useEffect(() => {
    if (!selectedTrendRecord || !trendDataset) {
      return;
    }
    if (selectedTrendRecord.datasetId !== trendDataset.id) {
      setSelectedTrendRecord(null);
    }
  }, [selectedTrendRecord, trendDataset]);

  useEffect(() => {
    if (datasets.length === 0) {
      setSelectedTrendDatasetId("");
      return;
    }

    setSelectedTrendDatasetId((current) =>
      datasets.some((dataset) => dataset.id === current) ? current : datasets[0].id,
    );
  }, [datasets]);

  useEffect(() => {
    if (trialIndexOptions.length === 0) {
      setSelectedTrialIndexes([]);
      return;
    }
    setSelectedTrialIndexes((prev) =>
      prev.length === 0 ? prev : prev.filter((indexNo) => trialIndexOptions.includes(indexNo)),
    );
  }, [trialIndexOptions]);

  useEffect(() => {
    setConditionControl((prev) => {
      const filtered = prev.selectedConditions.filter((condition) =>
        conditionOptions.includes(condition),
      );
      const nextSelected = filtered.length > 0 ? filtered : conditionOptions;
      const nextBaseline = nextSelected.includes(prev.baselineCondition)
        ? prev.baselineCondition
        : (nextSelected[0] ?? "");
      if (
        nextSelected.join("|") === prev.selectedConditions.join("|") &&
        nextBaseline === prev.baselineCondition
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedConditions: nextSelected,
        baselineCondition: nextBaseline,
      };
    });
  }, [conditionOptions]);

  const canShowConditionComparison = hasSelectedFreqAndLevel;

  const handleSelectTrendRecord = (record: TrendRecordSelection | null) => {
    if (!record) {
      setSelectedTrendRecord(null);
      return;
    }

    if (
      selectedTrendRecord?.datasetId === record.datasetId &&
      selectedTrendRecord.indexNo === record.indexNo
    ) {
      setSelectedTrendRecord(null);
      return;
    }

    setSelectedTrendDatasetId(record.datasetId);
    setSelectedTrendRecord(record);
  };

  useEffect(() => {
    if (!selectedTrendRecord) {
      return;
    }
    if (selectedTrialIndexes.length === 0) {
      return;
    }
    if (!selectedTrialIndexes.includes(selectedTrendRecord.indexNo)) {
      setSelectedTrendRecord(null);
    }
  }, [selectedTrialIndexes, selectedTrendRecord]);

  const handleApply = () => {
    applyFilters();
    void fetchDatasets(draftFilters);
  };

  const handleReset = () => {
    resetFilters();
    void fetchDatasets(DEFAULT_MEASUREMENT_FILTER);
  };

  return (
    <div>
      <PageHeader
        title="單一資料分析（舊版）"
        description="查看單一資料分析、KPI、趨勢圖、baseline 對照與製程條件比較"
      />

      <MeasurementFilterBar
        filters={draftFilters}
        baselines={baselines}
        conditionOptions={filterOptions.conditionLabels}
        frequencyOptions={filterOptions.frequencies}
        levelOptions={filterOptions.levels}
        onFiltersChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
      />

      {loading ? (
        <p className="text-sm text-slate-500">載入中...</p>
      ) : datasets.length === 0 ? (
        <EmptyState title="查無資料" description="請調整查詢條件後再試。" />
      ) : (
        <>
          <KpiGrid
            measurementRecordCount={summary.measurementRecordCount}
            baselineStatus={summary.baselineStatus}
            baselineMaxDeviation={summary.baselineMaxDeviation}
            baselineDisplayName={summary.baselineDisplayName}
            averageValues={summary.averageValues}
          />

          <SectionCard title="趨勢分析（總覽 + 單一參數）">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">
                目前查到 <span className="font-semibold text-slate-900">{datasets.length}</span> 組 dataset，共{" "}
                <span className="font-semibold text-slate-900">{totalRecordCount}</span> 筆量測資料。
              </p>
              {datasets.length > 1 ? (
                <div className="min-w-[260px] space-y-1">
                  <p className="text-xs text-slate-500">選擇要查看趨勢的 dataset</p>
                  <Select
                    value={selectedTrendDatasetId}
                    onValueChange={(value) => {
                      setSelectedTrendDatasetId(value);
                      setSelectedTrendRecord(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇 dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset, index) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          第 {index + 1} 組資料｜{dataset.datasetName}｜{dataset.conditionLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {trendDataset && trendDataset.records.length > 0 ? (
              <>
                <TrendSectionHeader
                  title="總覽多軸圖"
                  description="同圖總覽 Rp / Cp / Rs / Cs，單筆線較淡、平均線較粗、baseline 以虛線標示。"
                  collapsed={overviewCollapsed}
                  onToggle={() => setOverviewCollapsed((prev) => !prev)}
                  showClearSelection
                  clearSelectionDisabled={selectedTrendRecord === null}
                  onClearSelection={() => setSelectedTrendRecord(null)}
                />
                {overviewCollapsed ? null : (
                  <div className="mb-5 min-w-0 rounded-md border border-slate-200 p-3">
                    <ChartControlPanel
                      showAverage={trendOverviewControl.showAverage}
                      showBaseline={trendOverviewControl.showBaseline}
                      onShowAverageChange={(checked) =>
                        setTrendOverviewControl((prev) => ({ ...prev, showAverage: checked }))
                      }
                      onShowBaselineChange={(checked) =>
                        setTrendOverviewControl((prev) => ({ ...prev, showBaseline: checked }))
                      }
                      trialIndexOptions={trialIndexOptions}
                      selectedTrialIndexes={selectedTrialIndexes}
                      onSelectedTrialIndexesChange={setSelectedTrialIndexes}
                    />
                    <TrendOverviewMultiAxisChart
                      dataset={trendDataset}
                      showAverage={trendOverviewControl.showAverage}
                      showBaseline={trendOverviewControl.showBaseline}
                      selectedTrialIndexes={selectedTrialIndexes}
                      selectedRecord={selectedTrendRecord}
                      onSelectRecord={handleSelectTrendRecord}
                    />
                  </div>
                )}

                <TrendSectionHeader
                  title="單一參數詳細圖"
                  description="以 tabs 切換 Rp / Cp / Rs / Cs，檢視單參數細節。"
                  collapsed={singleCollapsed}
                  onToggle={() => setSingleCollapsed((prev) => !prev)}
                />
                {singleCollapsed ? null : (
                  <div className="min-w-0 rounded-md border border-slate-200 p-3">
                    <SingleParameterTrendChart
                      dataset={trendDataset}
                      parameter={singleTrendParameter}
                      onParameterChange={setSingleTrendParameter}
                      showAverage={singleTrendControl.showAverage}
                      showBaseline={singleTrendControl.showBaseline}
                      onShowAverageChange={(checked) =>
                        setSingleTrendControl((prev) => ({ ...prev, showAverage: checked }))
                      }
                      onShowBaselineChange={(checked) =>
                        setSingleTrendControl((prev) => ({ ...prev, showBaseline: checked }))
                      }
                      selectedRecord={selectedTrendRecord}
                      onSelectRecord={handleSelectTrendRecord}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="目前無可用趨勢資料"
                description="請確認查詢結果是否包含量測明細，或調整篩選條件後再試。"
              />
            )}
          </SectionCard>

          <SectionCard title="Baseline 對照分析">
            {canShowBaselineComparison ? (
              <>
                <BaselineComparisonTable rows={summary.baselineComparisonRows} />
                <ChartControlPanel
                  parameter={baselineControl.parameter}
                  showAverage={baselineControl.showAverage}
                  showBaseline={baselineControl.showBaseline}
                  showTrials={baselineControl.showTrials}
                  onParameterChange={(parameter) =>
                    setBaselineControl((prev) => ({ ...prev, parameter }))
                  }
                  onShowAverageChange={(checked) =>
                    setBaselineControl((prev) => ({ ...prev, showAverage: checked }))
                  }
                  onShowBaselineChange={(checked) =>
                    setBaselineControl((prev) => ({ ...prev, showBaseline: checked }))
                  }
                  onShowTrialsChange={(checked) =>
                    setBaselineControl((prev) => ({ ...prev, showTrials: checked }))
                  }
                />
                <div className="min-w-0">
                  <BaselineComparisonChart datasets={datasets} {...baselineControl} />
                </div>
              </>
            ) : (
              <EmptyState
                title="Baseline 對照目前不可用"
                description={baselineComparisonMessage}
              />
            )}
          </SectionCard>

          <SectionCard title="不同製程條件比較">
            {canShowConditionComparison ? (
              <>
                <ChartControlPanel
                  parameter={conditionControl.parameter}
                  compareMode={conditionControl.compareMode}
                  showBaseline={conditionControl.showBaseline}
                  conditionLayout
                  parameterVariant="tabs"
                  conditionOptions={conditionOptions}
                  selectedConditions={conditionControl.selectedConditions}
                  baselineCondition={conditionControl.baselineCondition}
                  onParameterChange={(parameter) =>
                    setConditionControl((prev) => ({ ...prev, parameter }))
                  }
                  onCompareModeChange={(compareMode) =>
                    setConditionControl((prev) => ({ ...prev, compareMode }))
                  }
                  onShowBaselineChange={(checked) =>
                    setConditionControl((prev) => ({ ...prev, showBaseline: checked }))
                  }
                  onSelectedConditionsChange={(selectedConditions) =>
                    setConditionControl((prev) => ({ ...prev, selectedConditions }))
                  }
                  onBaselineConditionChange={(baselineCondition) =>
                    setConditionControl((prev) => ({ ...prev, baselineCondition }))
                  }
                />
                <div className="min-w-0">
                  <ConditionComparisonChart
                    datasets={datasets}
                    selectedConditions={conditionControl.selectedConditions}
                    parameter={conditionControl.parameter}
                    mode={conditionControl.compareMode}
                    baselineCondition={conditionControl.baselineCondition}
                    showBaselineReference={conditionControl.showBaseline}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title="不同製程條件比較目前不可用"
                description="請先在上方查詢列指定單一 FREQ(Hz) 與 LEVEL，避免混合不同條件資料。"
              />
            )}
          </SectionCard>

          <SectionCard title="原始量測資料">
            <MeasurementDataTable
              datasets={datasets}
              selectedRecord={selectedTrendRecord}
              onSelectRecord={handleSelectTrendRecord}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
