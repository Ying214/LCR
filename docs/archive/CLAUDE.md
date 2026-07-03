# LCR Meter 量測資料系統

## 專案目標

建立一套 **LCR Meter 量測資料匯入、管理、分析與視覺化平台**，用來整理石墨晶舟 / 石墨金舟在不同製程條件下的阻抗量測結果。

第一版（MVP）重點：

1. 手動輸入量測資料
2. 預留檔案匯入入口
3. 依條件篩選量測資料
4. 自動計算平均值
5. 與 baseline 比較偏差
6. 以 KPI、圖表、表格方式顯示結果

**不做**：直接控制 LCR meter、真實檔案解析、登入權限、資料庫寫入、API 與儀器通訊。

---

## 背景

目前量測流程偏手動（人工抄寫 / 拍照 → 手動整理表格 → 手動計算平均值 → 比較判讀），問題是效率低、容易抄錯、不利於多次量測比較與不同製程條件的差異分析。本系統將量測資料標準化整理，並提供圖形化介面讓工程師快速判讀。

---

## 技術棧

| 項目 | 選型 |
|------|------|
| Framework | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Chart Library | Recharts |
| Data Source（第一版） | mock data / local state |

---

## 核心資料模型

### 資料型別

```ts
export type MeasurementCondition =
  | "未製程前"
  | "常溫製程後"
  | "300°C 製程後"
  | "清洗後"
  | "自訂";

export type MeasurementRecord = {
  id: string;
  datasetName: string;
  sampleId: string;
  condition: string;
  frequencyHz: number;
  voltageV: number;
  trial: number;
  rp: number;
  cp: number;
  rs: number;
  cs: number;
  isBaseline?: boolean;
  note?: string;
  createdAt?: string;
};

export type MeasurementFilter = {
  datasetNames: string[];
  conditions: string[];
  frequencies: number[];
  voltages: number[];
  includeBaseline: boolean;
  showAverage: boolean;
  showTrials: boolean;
  showDeviationRange: boolean;
};
```

每筆量測資料包含：

- **基本資料**：資料名稱、樣品編號、製程條件、備註、是否為 baseline
- **量測設定**：Frequency (Hz)、Level / Voltage (V)、測次編號 trial、量測時間（選填）
- **量測結果**：Rp、Cp、Rs、Cs

---

## 檔案架構

```
src/
  app/
    layout.tsx
    page.tsx
    measurements/
      page.tsx
    measurements/new/
      page.tsx
    dashboard/
      page.tsx

  components/
    layout/
      AppShell.tsx
      PageHeader.tsx
      SectionCard.tsx
    measurements/
      MeasurementForm.tsx
      MeasurementBasicInfoForm.tsx
      MeasurementManualTable.tsx
      MeasurementImportPanel.tsx
      MeasurementFilterBar.tsx
      MeasurementDataTable.tsx
    dashboard/
      KpiCard.tsx
      KpiGrid.tsx
      TrendChart.tsx
      BaselineDeviationChart.tsx
      ConditionComparisonChart.tsx
      ChartControlPanel.tsx
    shared/
      EmptyState.tsx
      StatusBadge.tsx

  data/
    mockMeasurements.ts
    mockBaselines.ts

  lib/
    calculations.ts
    formatters.ts
    constants.ts
    types.ts
    mock-transformers.ts

  hooks/
    useMeasurementFilters.ts
    useMeasurementSummary.ts
```

---

## 頁面規劃

### `/measurements/new` - 新增量測資料頁

用來新增資料，支援手動輸入與檔案匯入入口。

**A. 基本資訊卡片**
- 資料名稱、樣品編號、製程條件、備註、設為 baseline（checkbox）

**B. 匯入方式切換**
- 手動輸入 / 檔案匯入

**C. 手動輸入表格**
- 欄位：trial、frequencyHz、voltageV、rp、cp、rs、cs
- 按鈕：新增一列、刪除一列、計算平均、儲存

**D. 檔案匯入面板**
- 選擇檔案按鈕、匯入格式選單、上傳預覽區、確認匯入按鈕
- 第一版僅做 UI 與 placeholder，不做真 parser
- 畫面上需標示「待確認儀器匯出格式」

### `/dashboard` - 量測分析 Dashboard

用來查詢、篩選、比較與視覺化量測資料。

**A. 篩選區**
- 欄位：資料名稱、製程條件、頻率、電壓、baseline 顯示選項、顯示平均值 / 單次量測 / 誤差範圍 checkbox
- 按鈕：查詢、重設
- 要有明確查詢按鈕，不採每次變更就立即查詢的模式

**B. KPI 區**
- 第一排：量測組數、平均偏差 %、最大偏差 %、baseline 狀態
- 第二排：平均 Rp、平均 Cp、平均 Rs、平均 Cs

**C. 圖表區 1：同條件量測趨勢圖**
- 折線圖，X 軸 trial，Y 軸數值，資料系列 Rp / Cp / Rs / Cs
- 可額外顯示平均線與 baseline 線

**D. 圖表區 2：相對 baseline 偏差**
- 水平條圖，Y 軸 Rp / Cp / Rs / Cs，X 軸偏差百分比 %

**E. 圖表區 3：不同製程條件比較**
- 群組柱狀圖，X 軸 condition，Y 軸平均值，資料系列 Rp / Cp / Rs / Cs

**F. 表格區：原始量測表**
- 欄位：資料名稱、條件、trial、頻率、電壓、Rp、Cp、Rs、Cs、baseline 標記

---

## 計算邏輯

所有計算邏輯集中在 `src/lib/calculations.ts`，不要散在頁面內。

### 平均值
對同一 dataset / condition / frequency / voltage 下的多次量測，分別計算 avgRp、avgCp、avgRs、avgCs。

### 偏差百分比
```ts
deviationPercent = ((currentValue - baselineValue) / baselineValue) * 100;
```

### 量測組數
查詢結果中的量測記錄筆數 / 符合條件的 trial 組數。

### 最大偏差
四個參數中相對 baseline 絕對值最大的偏差百分比。

### Baseline 狀態判定
| 絕對偏差 | 狀態 |
|----------|------|
| <= 3% | 正常 |
| > 3% 且 <= 7% | 注意 |
| > 7% | 異常 |

閾值先寫死在 `constants.ts`，之後再調整。

---

## Mock Data 規劃

在 `src/data/mockMeasurements.ts` 建立假資料，至少包含：

- 條件：未製程前、常溫製程後、300°C 製程後、baseline
- 每種條件至少 3 筆 trial
- 包含：10k Hz、40k Hz、2V

---

## UI/UX 設計原則

這是工程量測介面，優先順序：**清楚 > 可讀 > 好比較 > 好維護 > 美觀**

### 元件化原則
- 每個圖表獨立成元件
- KPI 卡片獨立成元件
- 篩選列獨立成元件
- 表單與手動輸入表格分開
- 計算邏輯與視圖邏輯分離

### 禁止事項
- 不要把整個 dashboard 全塞在一個 page.tsx
- 不要把 mock data 直接散落各元件
- 不要在 chart component 中寫過多商業邏輯
- 不要先做複雜資料庫與 API

---

## 第一版實作順序

1. **Step 1**：建立 Next.js 專案與基本 layout
2. **Step 2**：完成 `/measurements/new` 畫面（基本資訊表單、手動輸入表格、檔案匯入 placeholder）
3. **Step 3**：建立 mock data 與 types
4. **Step 4**：完成 `/dashboard`（FilterBar、KPI 區、TrendChart、BaselineDeviationChart、MeasurementDataTable）
5. **Step 5**：加入不同條件比較圖（ConditionComparisonChart）
6. **Step 6**：整理元件結構與樣式（提升可讀性、調整 spacing 與卡片樣式）

---

## 第二版可擴充方向

第一版完成後，第二版再考慮：

- 真正的檔案匯入 parser
- SQLite / Prisma 資料持久化
- 基準值管理頁
- 儀器匯出格式轉換
- 使用者權限
- 匯出報表（CSV / PDF）

---

## 實作原則

- 使用 Next.js App Router
- 使用 TypeScript
- 使用 Tailwind CSS
- UI 以乾淨、工程儀表板風格為主
- 每個主要區塊拆成元件
- 計算邏輯集中在 `lib/calculations.ts`
- 第一版使用 mock data，不串真 API
- 檔案匯入先做 UI，不做真實解析
- 所有頁面與元件需可後續維護，不可全部寫在單一檔案
- 若某功能尚未完成，請用 TODO 或 placeholder 明確標註
