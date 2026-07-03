"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppSettings } from "@/components/settings/SettingsProvider";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DisplayMode } from "@/lib/app-settings";
import type { MeasurementDatasetListResponse } from "@/lib/api-types";
import type { OcrRecordTracking } from "@/lib/ocr-tracking";
import { summarizeOcrTracking, type OcrTrackingSummary } from "@/lib/ocr-tracking";

export function SettingsPagePanel() {
  const {
    settings,
    serverTrackingEnabled,
    effectiveOcrAccuracyTrackingEnabled,
    setDisplayMode,
    setOcrAccuracyTrackingEnabled,
  } = useAppSettings();
  const [draftDisplayMode, setDraftDisplayMode] = useState<DisplayMode>(settings.displayMode);
  const [draftTrackingEnabled, setDraftTrackingEnabled] = useState<boolean>(
    settings.ocrAccuracyTrackingEnabled,
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [trackingSummary, setTrackingSummary] = useState<OcrTrackingSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setDraftDisplayMode(settings.displayMode);
    setDraftTrackingEnabled(settings.ocrAccuracyTrackingEnabled);
  }, [settings.displayMode, settings.ocrAccuracyTrackingEnabled]);

  const dirty = useMemo(
    () =>
      draftDisplayMode !== settings.displayMode ||
      draftTrackingEnabled !== settings.ocrAccuracyTrackingEnabled,
    [draftDisplayMode, draftTrackingEnabled, settings.displayMode, settings.ocrAccuracyTrackingEnabled],
  );

  useEffect(() => {
    if (dirty) {
      setSavedNotice(null);
    }
  }, [dirty]);

  const loadTrackingSummary = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch("/api/measurements");
      if (!response.ok) {
        setStatsError("載入 OCR Accuracy 統計失敗。");
        return;
      }
      const json = (await response.json()) as MeasurementDatasetListResponse;
      const records = json.data.flatMap((dataset) => dataset.records) as Array<{
        ocrTracking?: OcrRecordTracking | null;
      }>;
      setTrackingSummary(summarizeOcrTracking(records));
    } catch {
      setStatsError("載入 OCR Accuracy 統計失敗。");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrackingSummary();
  }, [loadTrackingSummary]);

  const handleSaveSettings = () => {
    setDisplayMode(draftDisplayMode);
    setOcrAccuracyTrackingEnabled(draftTrackingEnabled);
    setSavedNotice("設定已儲存。");
  };

  const handleClearTracking = async () => {
    const confirmed = window.confirm(
      "是否確定清除所有 OCR Accuracy 紀錄？\n此操作不可復原。",
    );
    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setClearNotice(null);
    try {
      const response = await fetch("/api/measurements/ocr-tracking", {
        method: "DELETE",
      });
      if (!response.ok) {
        setClearNotice("清除 OCR Accuracy 紀錄失敗。");
        return;
      }
      setClearNotice("已清除 OCR Accuracy 紀錄。");
      await loadTrackingSummary();
    } catch {
      setClearNotice("清除 OCR Accuracy 紀錄失敗。");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="顯示設定" description="控制系統資料呈現方式，不影響資料儲存與計算。">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="space-y-1">
            <Label htmlFor="display-mode-select">單位顯示模式</Label>
            <p className="text-xs text-slate-500">切換資料呈現單位，儲存後套用到管理頁與 dashboard-compare。</p>
          </div>
          <Select value={draftDisplayMode} onValueChange={(value) => setDraftDisplayMode(value as DisplayMode)}>
            <SelectTrigger id="display-mode-select" className="max-w-sm bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">標準單位顯示（Hz / V / Ω / F）</SelectItem>
              <SelectItem value="friendly">友善單位顯示（自動縮放）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard title="OCR 設定" description="控制 OCR 準確率記錄與顯示行為。">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label htmlFor="ocr-tracking-switch">OCR 準確率記錄</Label>
              <p className="text-xs text-slate-500">
                開啟時才會在儲存量測資料時產生 `ocrTracking`，並在管理頁顯示 OCR 準確率。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {draftTrackingEnabled ? "ON" : "OFF"}
              </span>
              <Switch
                id="ocr-tracking-switch"
                checked={draftTrackingEnabled}
                onCheckedChange={setDraftTrackingEnabled}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <p>Server OCR tracking：{serverTrackingEnabled ? "ON" : "OFF（受 OCR_ACCURACY_TRACKING_ENABLED 控制）"}</p>
            <p>目前生效狀態：{effectiveOcrAccuracyTrackingEnabled ? "ON" : "OFF"}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="OCR Accuracy 統計" description="全系統 OCR record-level 準確率統計。">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 text-sm text-slate-700">
          {statsLoading ? <p>載入統計中...</p> : null}
          {statsError ? <p className="text-rose-700">{statsError}</p> : null}
          {!statsLoading && !statsError && trackingSummary ? (
            <>
              <p className="font-semibold text-slate-900">
                總 OCR 準確率：{((trackingSummary.accuracyRate ?? 0) * 100).toFixed(1)}%
              </p>
              <p>正確筆數：{trackingSummary.correctRecordCount} / {trackingSummary.trackedRecordCount}</p>
              <p>錯誤筆數：{trackingSummary.incorrectRecordCount}</p>
              <p>有 tracking 的 record 數：{trackingSummary.trackedRecordCount}</p>
            </>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="儲存設定" description="按下後才會寫入設定。">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSaveSettings} disabled={!dirty}>
            儲存設定
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty}
            onClick={() => {
              setDraftDisplayMode(settings.displayMode);
              setDraftTrackingEnabled(settings.ocrAccuracyTrackingEnabled);
              setSavedNotice(null);
            }}
          >
            取消變更
          </Button>
          <p className="text-xs text-slate-500">{dirty ? "有未儲存變更" : "目前沒有未儲存變更"}</p>
          {savedNotice ? <p className="text-xs font-semibold text-emerald-700">{savedNotice}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="危險操作" description="只清除 OCR Accuracy 紀錄，不刪除 dataset 與 record。">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="destructive" onClick={() => void handleClearTracking()} disabled={isClearing}>
            {isClearing ? "清除中..." : "清除 OCR Accuracy 紀錄"}
          </Button>
          {clearNotice ? <p className="text-xs font-semibold text-slate-700">{clearNotice}</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
