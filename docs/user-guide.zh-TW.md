# 使用者操作手冊

本文件說明如何使用 LCR OCR Dashboard 建立量測資料、執行 OCR、管理 Dataset / Baseline、查看 Dashboard，以及匯出報告。Windows 本機安裝、PaddleOCR CPU 與 port 設定請參考 [部署說明](deployment.zh-TW.md)。

## 系統入口

系統啟動後，預設網址通常是：

```text
http://localhost:3100
```

如果維護者修改 `LCR_PORT`，請依實際網址開啟系統。

左側導覽包含：

- 量測分析 Dashboard
- 新增量測資料
- 量測資料管理
- Baseline 管理
- 系統設定

## 新增量測資料

進入「新增量測資料」後，可選擇建立新 Dataset，或將 records 加入既有 Dataset。

建立新 Dataset 時需填寫：

- 資料名稱
- 製程條件
- 多筆量測 records

每筆 record 包含：

- FREQ
- LEVEL
- Rp
- Cp
- Rs
- Cs

系統會在儲存時將數值轉換成標準單位，並保留使用者輸入的原始單位資訊。

## 使用 OCR 匯入圖片

1. 進入「新增量測資料」。
2. 在「圖片上傳匯入」區塊選擇量測圖片。
3. 按下「上傳並預填表格」。
4. 系統會呼叫 OCR API，解析圖片中的量測資料。
5. OCR 完成後，資料會預填到下方表格。
6. 使用者需逐列確認 FREQ、LEVEL、Rp、Cp、Rs、Cs 是否正確。
7. 如有辨識錯誤，可直接在表格中修正。
8. 確認後按下儲存。

OCR 區塊會顯示辨識品質與欄位檢查提示。若欄位缺值或信心度偏低，請優先人工確認。

## Dataset 管理

進入「量測資料管理」可查看已建立的 Dataset。此頁面可用於：

- 查看 Dataset 基本資訊。
- 展開 Dataset records。
- 查看 OCR 原圖與 OCR 標記圖。
- 查看 OCR raw data 解析預覽。
- 編輯 Dataset 基本資訊。
- 編輯或刪除單筆 record。
- 檢查 OCR Accuracy 相關資訊。

若 Dashboard 沒有資料，請先確認這裡是否已有 Dataset 與 records。

## Baseline 管理

Baseline 是比較用參考值。進入「Baseline 管理」可：

- 建立 Baseline。
- 編輯 Baseline。
- 查看 Baseline 清單。

Baseline 欄位包含：

- 名稱
- 製程條件
- FREQ
- LEVEL
- Rp
- Cp
- Rs
- Cs
- 備註

Dashboard 可將 Baseline 作為 Sample 1 參與比較。

## Dashboard

進入「量測分析 Dashboard」後，可比較多組 Dataset 或 Baseline。

基本流程：

1. 在「選擇比較樣本」選擇要比較的 Dataset。
2. 選擇資料來源，例如全部平均、特定頻率平均或指定 record。
3. 視需要新增更多比較樣本。
4. 視需要選擇 Baseline，並設定是否讓 Baseline 作為第一個比較樣本。
5. 查看多資料比較圖、Scale Bar 圖與比較資料表。

Dashboard 目前主要包含：

- 多資料比較圖（Parallel Coordinates）
- 單一參數比較（Scale Bar）
- 比較資料表
- 匯出比較報告

## 比較資料表

比較資料表會列出每個比較樣本的：

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

如果某個 Dataset 缺少可用數值，系統會在表格中顯示缺值提示。

## 系統設定

進入「系統設定」可調整：

- 單位顯示模式：標準單位或友善單位。
- OCR 準確率記錄：控制是否儲存 OCR 初始值與修正後結果。
- OCR Accuracy 統計：查看全系統 record-level OCR 準確率。
- 清除 OCR Accuracy 紀錄：只清除 tracking，不刪除 Dataset 與 records。

## 匯出比較報告 PDF

在「匯出比較報告」區塊按「下載比較報告 PDF」後，瀏覽器會開啟列印視窗。請選擇「另存為 PDF」。

報告包含：

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

## 下載多資料比較圖 PNG

在「多資料比較圖」區塊右側按「下載 PNG」。

檔名格式：

```text
compare-overview-YYYYMMDD.png
```

此 PNG 只包含真正的多資料比較圖，不包含側邊欄、按鈕或工具列。

## 下載 Scale Bar ZIP

在「單一參數比較（Scale Bar）」區塊右側按「下載 ZIP」。

檔名格式：

```text
scale-charts-YYYYMMDD.zip
```

ZIP 內含：

```text
scale-rp.png
scale-cp.png
scale-rs.png
scale-cs.png
```

若某個參數沒有可匯出的資料，系統會略過該 PNG，不會讓整包 ZIP 失敗。

## 下載比較表 CSV

在「匯出比較報告」區塊按「下載比較表 CSV」。

檔名格式：

```text
compare-table-YYYYMMDD.csv
```

CSV 欄位與 Dashboard 比較資料表一致，並加入 UTF-8 BOM，方便 Excel 開啟中文。若資料來源是「全部平均」，CSV 的 FREQ 會顯示「全部平均」；若是特定頻率或指定 record，則顯示對應頻率。

## 常見操作問題

### Dashboard 沒有資料

請確認：

- 是否已建立 Dataset。
- Dataset 內是否有 records。
- OCR 是否成功，或手動輸入是否已儲存。
- 比較樣本是否選到正確 Dataset。

### OCR 無法連線

請先自行確認：

- OCR Server 是否已啟動，PowerShell 視窗是否仍在執行。
- Next.js 是否已啟動。
- `OCR_API_URL` 是否設定為正確的 OCR Server 位址與 port。

若以上項目都正常但仍無法連線，再通知維護者協助檢查。

### OCR 解析結果不準

OCR 結果需要人工覆核。請直接在表格中修正錯誤欄位，再儲存 Dataset。

### 圖表無法下載

請確認：

- Dashboard 已有可比較資料。
- 圖表已經顯示在畫面上。
- 瀏覽器未封鎖下載。

### CSV 中文亂碼

目前 CSV 已加入 UTF-8 BOM，通常可直接用 Excel 開啟。如果仍遇到亂碼，請用 Excel 的資料匯入功能開啟 CSV，編碼選 UTF-8。
