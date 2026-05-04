# LCR Meter 量測資料系統 - 第一版 MVP 實作指令

> **重要：開始實作前，請先完整閱讀本專案根目錄的 `CLAUDE.md` 檔案。**
> 該檔案包含完整的系統規格書，包括資料模型、檔案架構、頁面規劃、計算邏輯、UI/UX 原則等所有設計細節。
> 以下 prompt 是基於該規格書的實作指令，兩份文件需搭配使用。

---

## 你的任務

請依照 `CLAUDE.md` 中的規格，從零開始建立一個 LCR Meter 量測資料系統的第一版 MVP。這是一個工程量測資料管理與視覺化平台，讓工程師可以輸入阻抗量測資料、篩選比較、並透過圖表快速判讀結果。

---

## 技術要求

- **Framework**：Next.js（使用 App Router，不要用 Pages Router）
- **Language**：TypeScript（嚴格型別，不要用 any）
- **Styling**：Tailwind CSS
- **UI Components**：shadcn/ui
- **Chart Library**：Recharts
- **Data Source**：mock data / local state（不串真 API、不接資料庫）
- **檔案匯入**：第一版僅做 UI placeholder，不做真實檔案解析

---

## 實作步驟

請按照以下順序實作，每一步完成後確認可正常運行再進下一步。

### Step 1：專案初始化與基本 Layout

1. 使用 `npx create-next-app@latest` 建立 Next.js 專案（TypeScript + Tailwind CSS + App Router）
2. 安裝 shadcn/ui 並初始化
3. 安裝 Recharts：`npm install recharts`
4. 建立基本 layout 元件：
   - `src/components/layout/AppShell.tsx` — 整體框架，包含側邊欄或頂部導航列，連結到 `/measurements/new` 和 `/dashboard`
   - `src/components/layout/PageHeader.tsx` — 頁面標題元件
   - `src/components/layout/SectionCard.tsx` — 卡片容器元件，用於包裝各區塊
5. 設定 `src/app/layout.tsx` 使用 AppShell

### Step 2：建立基礎檔案（Types、Constants、Mock Data）

1. **`src/lib/types.ts`** — 定義所有型別，參照 `CLAUDE.md` 中的資料型別章節：
   - `MeasurementCondition`
   - `MeasurementRecord`
   - `MeasurementFilter`

2. **`src/lib/constants.ts`** — 定義常數：
   - Baseline 偏差閾值：正常 <= 3%、注意 > 3% 且 <= 7%、異常 > 7%
   - 製程條件選項列表
   - 預設頻率與電壓選項

3. **`src/lib/calculations.ts`** — 實作所有計算邏輯（**所有計算必須集中在這個檔案，不可散落在頁面或元件中**）：
   - `calculateAverage(records: MeasurementRecord[])` → 回傳 avgRp、avgCp、avgRs、avgCs
   - `calculateDeviation(currentValue: number, baselineValue: number)` → 回傳偏差百分比
   - `calculateDeviations(records: MeasurementRecord[], baseline: MeasurementRecord[])` → 回傳各參數偏差
   - `getMaxDeviation(deviations)` → 回傳最大絕對偏差
   - `getBaselineStatus(deviation: number)` → 回傳 "正常" | "注意" | "異常"
   - `getMeasurementCount(records: MeasurementRecord[])` → 回傳量測組數

4. **`src/lib/formatters.ts`** — 格式化工具：
   - 數值格式化（小數位數控制）
   - 百分比格式化
   - 頻率顯示格式化（Hz → kHz）

5. **`src/data/mockMeasurements.ts`** — 建立 mock 資料，必須包含：
   - 條件：`未製程前`、`常溫製程後`、`300°C 製程後`
   - 其中 `未製程前` 設為 baseline
   - 每種條件至少 3 筆 trial
   - 頻率包含：10000 Hz、40000 Hz
   - 電壓：2V
   - Rp / Cp / Rs / Cs 數值要合理，baseline 與其他條件之間要有可辨識的差異（方便圖表展示）

### Step 3：完成 `/measurements/new` 新增量測資料頁

建立 `src/app/measurements/new/page.tsx` 與以下元件：

1. **`src/components/measurements/MeasurementForm.tsx`** — 整合表單容器，組合以下子元件

2. **`src/components/measurements/MeasurementBasicInfoForm.tsx`** — 基本資訊區塊：
   - 資料名稱（text input）
   - 樣品編號（text input）
   - 製程條件（select dropdown，選項來自 constants）
   - 備註（textarea）
   - 設為 baseline（checkbox）

3. 匯入方式切換：提供 Tab 或 Toggle 切換「手動輸入」與「檔案匯入」

4. **`src/components/measurements/MeasurementManualTable.tsx`** — 手動輸入表格：
   - 表格欄位：trial、frequencyHz、voltageV、rp、cp、rs、cs
   - 每個欄位都可直接在表格內編輯（inline input）
   - 「新增一列」按鈕：在表格底部加入空白列
   - 「刪除一列」按鈕：刪除選取的列
   - 「計算平均」按鈕：計算目前所有列的平均值並顯示在表格下方
   - 「儲存」按鈕：將資料存入 local state（第一版先用 console.log 或 alert 確認）

5. **`src/components/measurements/MeasurementImportPanel.tsx`** — 檔案匯入面板（placeholder）：
   - 選擇檔案按鈕（disabled 或顯示提示）
   - 匯入格式下拉選單（CSV / TSV / 自訂，僅 UI）
   - 上傳預覽區（空白區塊，顯示「上傳後資料將顯示在此」）
   - 確認匯入按鈕（disabled）
   - **必須在畫面上明確標示「待確認儀器匯出格式 — 此功能為 placeholder」**

### Step 4：完成 `/dashboard` 量測分析 Dashboard

建立 `src/app/dashboard/page.tsx` 與以下元件：

1. **`src/components/measurements/MeasurementFilterBar.tsx`** — 篩選區：
   - 資料名稱多選（或單選下拉）
   - 製程條件多選
   - 頻率選擇
   - 電壓選擇
   - 顯示選項：
     - 包含 baseline（checkbox）
     - 顯示平均值（checkbox）
     - 顯示單次量測（checkbox）
     - 顯示誤差範圍（checkbox）
   - **「查詢」按鈕**（點擊後才執行篩選，不要做即時篩選）
   - **「重設」按鈕**（清除所有篩選條件）

2. **`src/components/dashboard/KpiGrid.tsx`** + **`KpiCard.tsx`** — KPI 區：
   - 第一排四張卡片：
     - 量測組數
     - 平均偏差 %（所有參數平均）
     - 最大偏差 %（四個參數中最大的）
     - Baseline 狀態（正常 / 注意 / 異常，用顏色區分）
   - 第二排四張卡片：
     - 平均 Rp
     - 平均 Cp
     - 平均 Rs
     - 平均 Cs

3. **`src/components/dashboard/TrendChart.tsx`** — 同條件量測趨勢圖：
   - 圖表類型：折線圖（Recharts `<LineChart>`）
   - X 軸：trial 編號
   - Y 軸：數值
   - 資料系列：Rp、Cp、Rs、Cs（四條線，不同顏色）
   - 可選顯示：平均線（虛線）、baseline 線（點線）
   - 需有圖例（Legend）

4. **`src/components/dashboard/BaselineDeviationChart.tsx`** — 相對 baseline 偏差圖：
   - 圖表類型：水平條圖（Recharts `<BarChart>` layout="vertical"）
   - Y 軸：Rp / Cp / Rs / Cs
   - X 軸：偏差百分比 %
   - 正偏差與負偏差用不同顏色
   - 顯示偏差數值標籤

5. **`src/components/dashboard/ConditionComparisonChart.tsx`** — 不同製程條件比較圖：
   - 圖表類型：群組柱狀圖（Recharts `<BarChart>`）
   - X 軸：製程條件（未製程前、常溫製程後、300°C 製程後）
   - Y 軸：平均值
   - 資料系列：Rp、Cp、Rs、Cs（四組柱狀，不同顏色）
   - 需有圖例

6. **`src/components/dashboard/ChartControlPanel.tsx`** — 圖表控制面板：
   - 切換顯示哪些參數（Rp / Cp / Rs / Cs toggle）
   - 可與各圖表搭配使用

7. **`src/components/measurements/MeasurementDataTable.tsx`** — 原始量測表格：
   - 欄位：資料名稱、條件、trial、頻率、電壓、Rp、Cp、Rs、Cs、baseline 標記
   - 支援排序（至少依 trial 排序）
   - Baseline 資料用特殊標記或背景色區分

### Step 5：建立 Hooks

1. **`src/hooks/useMeasurementFilters.ts`** — 篩選邏輯 hook：
   - 管理篩選條件 state
   - 提供 applyFilters / resetFilters 方法
   - 回傳篩選後的資料

2. **`src/hooks/useMeasurementSummary.ts`** — 摘要計算 hook：
   - 接收篩選後的資料
   - 回傳 KPI 所需的計算結果（平均值、偏差、狀態等）

### Step 6：共用元件

1. **`src/components/shared/EmptyState.tsx`** — 空狀態提示（查無資料時顯示）
2. **`src/components/shared/StatusBadge.tsx`** — 狀態標籤（正常=綠、注意=黃、異常=紅）

---

## 頁面組裝說明

### `/measurements/new` 頁面組裝順序（由上到下）

```
PageHeader（標題：新增量測資料）
└── SectionCard（基本資訊）
    └── MeasurementBasicInfoForm
└── SectionCard（量測資料）
    ├── Tab: 手動輸入
    │   └── MeasurementManualTable
    └── Tab: 檔案匯入
        └── MeasurementImportPanel
```

### `/dashboard` 頁面組裝順序（由上到下）

```
PageHeader（標題：量測分析 Dashboard）
└── MeasurementFilterBar
└── KpiGrid
    └── KpiCard x 8
└── SectionCard（同條件量測趨勢）
    └── TrendChart
└── SectionCard（相對 Baseline 偏差）
    └── BaselineDeviationChart
└── SectionCard（不同製程條件比較）
    └── ConditionComparisonChart
└── SectionCard（原始量測資料）
    └── MeasurementDataTable
```

---

## 設計風格要求

- 整體風格：專業、乾淨、工程儀表板風格
- 配色：以中性色為主（灰、白、深色），KPI 與狀態用語意色（綠=正常、黃=注意、紅=異常）
- 圖表配色：Rp / Cp / Rs / Cs 四個參數使用固定且可區分的顏色，全系統統一
- 間距：各區塊之間保持足夠間距，不可擁擠
- 字體：使用系統字體或 Tailwind 預設，數值顯示用等寬字體
- RWD：第一版不強求完美 RWD，但桌面版（1280px+）必須正常顯示

---

## Placeholder 與 TODO 標記規則

對於第一版未完成的功能，必須：

1. 在程式碼中加上 `// TODO:` 註解說明後續要做什麼
2. 在 UI 上顯示明確的 placeholder 文字，讓使用者知道這是暫時的
3. 具體需標記的項目：
   - 檔案匯入功能：`// TODO: 實作檔案解析 parser，待確認儀器匯出格式`
   - 資料儲存：`// TODO: 接入資料庫或 API，目前使用 local state`
   - 匯出功能：`// TODO: 實作 CSV / PDF 匯出`

---

## 驗收標準

實作完成後，系統必須滿足：

- [ ] `npm run dev` 可正常啟動，無 TypeScript 錯誤
- [ ] `/measurements/new` 頁面可正常顯示，手動輸入表格可新增/刪除列
- [ ] `/dashboard` 頁面可正常顯示所有圖表與 KPI
- [ ] 篩選功能可正常運作（點查詢後更新結果）
- [ ] KPI 數值正確（平均值、偏差、狀態）
- [ ] 趨勢圖正確顯示同條件多次量測
- [ ] Baseline 偏差圖正確顯示各參數偏差
- [ ] 不同製程條件比較圖正確顯示
- [ ] 原始量測表格正確顯示所有資料
- [ ] 所有 placeholder 功能有明確標示
- [ ] 元件拆分清楚，沒有單一檔案超過 300 行
- [ ] 計算邏輯全部在 `lib/calculations.ts`，不在元件中

---

## 最後提醒

1. **先讀 `CLAUDE.md`**，裡面有完整的資料模型、檔案架構、頁面設計細節
2. 不要跳過步驟，按順序實作
3. 每完成一個步驟，確認頁面可正常運行
4. 如果某個 shadcn/ui 元件需要安裝，請用 `npx shadcn@latest add <component>` 安裝
5. 遇到不確定的設計決策，優先參考 `CLAUDE.md` 中的規格
