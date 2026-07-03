# LCR OCR Dashboard 使用者操作手冊

這份文件給實際使用系統的人閱讀，重點是如何新增量測資料、執行 OCR、查看 Dashboard，以及下載圖表與分析結果。安裝、Docker、GPU 與 port 部署細節請看 [部署說明](deployment.zh-TW.md)。

## 1. 系統入口

系統啟動後，預設網址通常是：

```text
http://localhost:3100
```

如果維護者修改了 `LCR_PORT`，請依實際 port 開啟，例如：

```text
http://localhost:3200
```

左側導覽包含：

- 量測分析 Dashboard
- 新增量測資料
- 量測資料管理
- Baseline 管理
- 系統設定

## 2. 新增量測資料

1. 進入「新增量測資料」。
2. 填寫 Dataset 基本資料，例如 Dataset 名稱、Condition Label、備註與 Baseline。
3. 選擇新增方式：
   - 手動輸入量測 records。
   - 上傳圖片並執行 OCR，讓系統預填資料。
4. 檢查每筆 record 的 FREQ、LEVEL、Rp、Cp、Rs、Cs。
5. 確認資料無誤後儲存。

儲存後可到「量測資料管理」查看或維護 Dataset。

## 3. 執行 OCR

1. 進入「新增量測資料」。
2. 在 OCR 匯入區選擇量測圖片。
3. 按下 OCR 解析按鈕。
4. 等待 OCR API 回傳結果。
5. 檢查系統預填的 records。
6. 如有辨識錯誤，直接在表格中手動修正。
7. 確認後儲存 Dataset。

OCR 成功後，系統可能顯示原始圖片、OCR 標記圖片、解析列與信心度資訊。若 OCR 無法連線，請通知維護者檢查 OCR API 與 `OCR_API_URL`。

## 4. 管理量測資料

進入「量測資料管理」可以：

- 查看已建立的 Dataset。
- 展開 Dataset records。
- 編輯 Dataset 基本資訊。
- 編輯或刪除單筆 record。
- 查看 OCR 圖片與 OCR 準確率資訊。

如果 Dashboard 沒有資料，請先確認這裡是否已經有 Dataset 與 records。

## 5. 管理 Baseline

1. 進入「Baseline 管理」。
2. 按「新增 Baseline」建立參考值。
3. 填寫名稱、Condition Label、FREQ、LEVEL、Rp、Cp、Rs、Cs。
4. 儲存後可在新增 Dataset 或 Dashboard 比較時選用。

Baseline 可用來作為比較基準，也可在 Dashboard 中當作 Sample 1 顯示。

## 6. 查看 Dashboard

進入「量測分析 Dashboard」後，可以比較多組 Dataset 的平均量測結果。

基本流程：

1. 在「選擇比較樣本」選擇要比較的 Dataset。
2. 選擇資料來源，例如全部平均、特定頻率平均或第幾筆 record。
3. 視需要新增更多比較樣本。
4. 視需要選擇 Baseline，並設定是否讓 Baseline 作為第一個比較樣本。
5. 查看多資料比較圖、Scale Bar 圖與比較資料表。

## 7. 比較 Dataset

Dashboard 的每個比較樣本會顯示：

- Dataset Name
- Condition Label
- 資料來源
- FREQ / LEVEL
- Rp / Cp / Rs / Cs
- Records Count
- 缺值提示

如果某個 Dataset 缺少可用數值，Dashboard 會在資料表與提示區顯示缺值訊息。

## 8. 選擇 Baseline

Dashboard 可使用 Baseline 作為比較基準。使用時請注意：

- 若開啟「Baseline 作為 C1 / Sample 1」類似選項，第一個比較樣本會改為選定 Baseline。
- 後續 Dataset 會往後排序為 Sample 2、Sample 3。
- 圖表上可顯示相對 Baseline 的誤差資訊。
- 若 Baseline 缺少 Rp / Cp / Rs / Cs，Dashboard 會顯示缺值提示。

## 9. 匯出比較報告 PDF

在「匯出比較報告」區塊按「下載比較報告 PDF」後，瀏覽器會開啟列印視窗。

請在列印視窗選擇「另存為 PDF」。報告包含：

- 報告標題
- 匯出時間
- Dashboard 名稱
- 比較資訊摘要
- 比較資料表
- 多資料比較圖（Parallel Coordinates）
- Rp / Cp / Rs / Cs Scale Bar

瀏覽器通常會使用下列名稱作為預設檔名：

```text
compare-report-YYYYMMDD.pdf
```

## 10. 下載圖表與比較表

Dashboard 的下載入口會依用途放在不同區塊：

- 「多資料比較圖」區塊右側的「下載 PNG」：下載多資料比較圖，檔名為 `compare-overview-YYYYMMDD.png`。
- 「單一參數比較（Scale Bar）」區塊右側的「下載 ZIP」：下載 `scale-charts-YYYYMMDD.zip`，ZIP 內含 `scale-rp.png`、`scale-cp.png`、`scale-rs.png`、`scale-cs.png`。
- 「匯出比較報告」區塊的「下載比較表 CSV」：下載 Dashboard 比較資料表，檔名為 `compare-table-YYYYMMDD.csv`。

CSV 欄位包含：

- 比較樣本
- Dataset Name
- Condition Label
- 資料來源
- FREQ
- LEVEL
- Rp
- Cp
- Rs
- Cs
- Records Count
- 缺值提示

CSV 會加入 UTF-8 BOM，通常可直接用 Excel 開啟中文。若資料來源是「全部平均」，CSV 的 FREQ 會顯示「全部平均」；若是特定頻率或特定 record，則顯示對應頻率。

## 11. 常見操作問題

### Dashboard 沒有資料

請先確認：

- 是否已新增 Dataset。
- Dataset 內是否有 records。
- OCR 是否成功，或手動輸入是否已儲存。
- 篩選或比較樣本是否選到正確 Dataset。

### OCR 無法連線

請通知維護者檢查：

- OCR API 是否已啟動。
- `OCR_API_URL` 是否指向正確 port。
- Docker container 是否正常執行。

### OCR 解析結果不準

可以直接在表格中手動修正。建議同時保留原圖與 OCR 標記圖，方便後續追查。

### 圖表 PNG 沒有下載

請確認：

- Dashboard 已有可比較資料。
- 多資料比較圖已經出現在畫面上。
- 瀏覽器 console 沒有 SVG / Canvas 轉檔錯誤。

### Scale Bar ZIP 沒有下載完整

請確認：

- Scale Bar 區塊已經顯示 Rp / Cp / Rs / Cs 圖表。
- 如果某個參數沒有資料，系統會略過該 PNG，不會讓整包 ZIP 失敗。
- 瀏覽器沒有封鎖下載。

### CSV 中文亂碼

目前 CSV 已加入 UTF-8 BOM，通常可直接用 Excel 開啟。如果仍遇到亂碼，請用 Excel 的「資料匯入」功能開啟 CSV，編碼選 UTF-8。
