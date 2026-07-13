# Windows CPU 部署交接文件

本文件為目前正式支援且完成驗證的 Windows CPU 部署流程。

這份文件是寫給第一次接手 LCR 專案的人。先照「快速開始」完成安裝與啟動；想知道每一步的用途，再看後面的說明。遇到問題時，直接跳到最後的「常見問題」。

目前已在 Intel Core i7-13700 上完成真實圖片測試，單張圖片約需 30 秒。實際速度會依 CPU、圖片大小與背景程式不同而有所差異，不代表每台電腦都固定是 30 秒。

## 第一章：快速開始

### 第一次安裝（只需要做一次）

以下操作都使用 Windows PowerShell。指令前不要自行加上 `PS C:\...>`。

#### 1. 安裝 Git、Node.js 與 Python

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
```

安裝完成後，關閉 PowerShell 再重新開啟，確認三個工具都能使用：

```powershell
git --version
node --version
python --version
```

本專案建議使用 64-bit Python 3.12。

#### 2. 取得專案

```powershell
git clone https://github.com/Ying214/LCR.git
Set-Location .\LCR
```

後續指令都在 LCR 專案根目錄執行。

#### 3. 建立 `.env`

```powershell
Copy-Item .env.example .env
```

預設設定會讓 Next.js 使用 `http://127.0.0.1:8001` 呼叫本機 OCR Server，Next.js 網頁則開在 `http://127.0.0.1:3100`。

#### 4. 建立 Python 虛擬環境

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

`python -m venv .venv` 執行成功後，虛擬環境就已建立。如果啟用時出現「這個系統上已停用指令碼執行」，原因是 PowerShell Execution Policy 阻擋 `Activate.ps1`，不是虛擬環境建立失敗。

建議設定目前 Windows 使用者的執行原則：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

出現確認提示時輸入 `Y`，再啟用虛擬環境：

```powershell
.\.venv\Scripts\Activate.ps1
```

這項設定只影響目前 Windows 使用者，之後開啟新的 PowerShell 視窗仍然有效。

如果不想變更使用者設定，可以只對目前 PowerShell 視窗暫時放行：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
```

關閉該 PowerShell 視窗後，暫時設定就會失效。

成功啟用後，命令列前方會出現 `(.venv)`，例如：

```text
(.venv) PS C:\...\LCR>
```

#### 5. 安裝 PaddlePaddle CPU、PaddleOCR 與 API 套件

```powershell
python -m pip install -r .\servers\ocr\requirements-paddle.txt
python -m pip install -r .\servers\ocr\requirements.txt
```

兩份 requirements 都要安裝，順序不要對調。

#### 6. 檢查 OCR 環境

```powershell
python .\servers\ocr\check_env.py
```

請確認輸出中包含：

```text
目前裝置: cpu
純 CPU 套件: True
```

看到一般 warning 不等於失敗；以上兩項正確，且程式沒有以 error 結束即可繼續。

#### 7. 安裝 Next.js 套件並初始化 Prisma / SQLite

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate
```

Migration 完成後只會建立資料表，不會自動建立 Baseline、Dataset 或 MeasurementRecord；新資料庫預設為空。完成後，第一次安裝就結束了。接下來照第二章啟動兩個服務。

## 第二章：每天啟動

每天使用時只要開啟兩個 PowerShell 視窗。兩個視窗都先切換到 LCR 專案根目錄。

### PowerShell 1：啟動 OCR Server

```powershell
& .\servers\ocr\start.ps1
```

看到下列網址代表 OCR Server 已啟動：

```text
http://127.0.0.1:8001
```

請保持這個視窗開啟。

### PowerShell 2：啟動 Next.js

```powershell
npm run dev
```

瀏覽器開啟：

```text
http://127.0.0.1:3100
```

日常啟動不需要：

- 重新建立 `.venv`。
- 重新執行 `pip install`。
- 重新執行 `npm ci`。
- 重新執行 Prisma migration。

只有 requirements、`package-lock.json` 或 Prisma migrations 有更新時，才需要重新處理對應步驟。`start.ps1` 會比對 requirements；內容沒變時會直接沿用現有環境。

### 停止服務

分別回到兩個 PowerShell 視窗，按下：

```text
Ctrl+C
```

停止服務不會刪除資料庫、圖片、模型或 `.venv`。

## 第三章：這些步驟在做什麼

### 系統怎麼串在一起

```text
使用者瀏覽器
  |
  v
Next.js（http://127.0.0.1:3100）
  |
  | OCR_API_URL
  v
FastAPI / Uvicorn（http://127.0.0.1:8001）
  |
  v
PaddleOCR PP-OCRv5 / PaddlePaddle CPU
  |
  +-- servers\ocr\data\ocr\  OCR 圖片與 JSON
  +-- prisma\dev.db           SQLite 資料庫
```

瀏覽器不會直接呼叫 PaddleOCR。圖片先送到 Next.js，再由 Next.js 呼叫 FastAPI。FastAPI 完成辨識後，把結果交回 Next.js 顯示與儲存。

### 為什麼要建立 `.env`

`.env` 保存這台電腦的啟動設定，其中最重要的是 OCR Server 位址：

```env
OCR_API_URL="http://127.0.0.1:8001"
OCR_API_TIMEOUT_MS="180000"
```

`OCR_API_TIMEOUT_MS` 是 180 秒。CPU 實測通常約 30 秒，但速度可能受電腦負載影響，所以不應在 30 秒時提早中止。

如果修改 `.env`，要重新啟動 Next.js 才會套用。

### 為什麼要建立 `.venv`

`.venv` 是這個專案專用的 Python 環境。它把 PaddleOCR、FastAPI 等套件和電腦上的其他 Python 專案分開，避免版本互相影響。

刪除 `.venv` 不會刪掉專案資料，但必須重新安裝 Python 套件才能啟動 OCR。

### 為什麼分兩份 requirements

`requirements-paddle.txt` 先從 PaddlePaddle 官方 CPU 套件來源安裝 CPU runtime；`requirements.txt` 再安裝 PaddleOCR、PaddleX OCR core、FastAPI、Uvicorn 與圖片處理套件。

目前固定版本如下：

| 元件 | 版本 |
| --- | --- |
| Python | 3.12（64-bit，建議） |
| PaddlePaddle CPU | 3.2.0 |
| PaddleOCR | 3.7.0 |
| PaddleX OCR core | 3.7.2 |
| FastAPI | 0.116.1 |
| Uvicorn | 0.35.0 |

專案只使用 PP-OCRv5 的文字偵測與文字辨識，不需要 PaddleOCR 的完整額外功能套件。請以 repository 內兩份 requirements 為準，不要自行改成網路文章中的其他版本。

### 為什麼要執行 `check_env.py`

這個檢查會顯示 PaddleOCR、PaddlePaddle 版本與目前裝置。交接時最重要的是確認：

```text
目前裝置: cpu
純 CPU 套件: True
```

這可以排除「套件看似裝好，實際卻用了另一個 Python 環境」的情況。

### 為什麼使用 `start.ps1`

`start.ps1` 會統一處理下列事情：

- 找到專案自己的 `.venv`。
- `.venv` 不存在時自動建立。
- requirements 有變更時才重新安裝套件。
- 啟動前執行 CPU 環境檢查。
- 將 FastAPI 固定啟動在 `127.0.0.1:8001`。

手動安裝完成後第一次執行腳本時，腳本可能會再檢查並記錄 requirements 狀態；之後內容沒變就不會每次重裝。

### 為什麼要初始化 Prisma

Prisma 負責應用程式與 SQLite 資料庫之間的操作：

- `npm run prisma:generate` 產生專案使用的 Prisma Client。
- `npm run prisma:migrate` 建立或更新 `prisma\dev.db` 的資料表，並固定略過 seed。

平常啟動不用重跑；只有 migrations 有新增時才需要執行。

需要示範資料時，可以手動執行：

```powershell
npm run db:seed
```

此指令會先刪除資料庫內既有的 Baseline、Dataset 與 MeasurementRecord，再建立示範資料。不可在已有正式資料的環境隨意執行。

## 第四章：模型、測試與維護

### 第一次模型下載

第一次啟動 OCR Server 時，PaddleOCR 會下載 PP-OCRv5 文字偵測與辨識模型，也可能因模型初始化而比平常慢。下載與初始化完成前服務尚未完全就緒，請保持網路連線並耐心等待 PowerShell 顯示 Uvicorn 已啟動，不要因為第一次等待較久就關閉視窗。

Windows 預設快取位置：

```text
C:\Users\<你的帳號>\.paddlex\official_models
```

模型下載完成後，之後通常會直接使用本機快取，不需要再次下載。不要在 OCR Server 執行期間刪除這個資料夾。

### OCR 速度

目前 CPU 流程已用真實 LCR BMP 圖片驗證：

- 測試處理器：Intel Core i7-13700。
- PaddleOCR predict：約 30 秒。
- 完整 API：約 30 秒。

實際速度會依 CPU、圖片大小與背景程式不同而有所差異。上傳後畫面等待一段時間屬於正常現象，只要兩個服務視窗沒有顯示 error，請先等待回應。

原專案開發環境使用 RTX 4060，當時單張圖片約 3～5 秒。GPU 流程仍可作為後續方向，但完整的新手安裝步驟尚未重新驗證；請看 [GPU 部署狀態說明](deployment-gpu.zh-TW.md)。

### 測試 OCR Server

先確認健康狀態：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
```

預期結果為 `ok`。

要用 LCR 圖片測試辨識，請將路徑換成實際 BMP 圖片：

```powershell
curl.exe -X POST -F "file=@C:\完整路徑\量測圖片.bmp" http://127.0.0.1:8001/ocr
```

辨識資料會寫入：

```text
servers\ocr\data\ocr\
```

### 完整重新安裝

只有 `.venv` 損壞、套件無法修復，或 CPU 檢查不正確時才需要重建。先在兩個服務視窗按 `Ctrl+C`，確認 OCR 與 Next.js 都已停止，再執行：

```powershell
Remove-Item -LiteralPath .\.venv -Recurse -Force
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
python -m pip install -r .\servers\ocr\requirements-paddle.txt
python -m pip install -r .\servers\ocr\requirements.txt
python .\servers\ocr\check_env.py
```

這個流程不會刪除 SQLite、OCR 圖片或模型快取。模型檔只有在終端機明確指出損壞時才需要另外處理。

## 第五章：常見問題

### 找不到 `python`、`node` 或 `git`

安裝完成後要關閉並重開 PowerShell，讓新的 PATH 生效。接著分別執行：

```powershell
python --version
node --version
git --version
```

Python 請使用 64-bit 3.12。

### `Activate.ps1` 被禁止執行

這代表 PowerShell Execution Policy 阻擋啟用腳本，不是 `.venv` 建立失敗。請依第一章「建立 Python 虛擬環境」選擇目前使用者設定或暫時設定，再重新執行 `Activate.ps1`。

### 缺少 DLL 或 native library 無法載入

先確認使用 64-bit Python。若仍缺少 DLL，安裝 Microsoft Visual C++ 2015–2022 Redistributable x64：

https://aka.ms/vs/17/release/vc_redist.x64.exe

安裝後重新開啟 PowerShell，再執行 `check_env.py`。

### 模型下載失敗

確認網路可連線、Windows 使用者目錄可以寫入，再重新執行：

```powershell
& .\servers\ocr\start.ps1
```

公司網路若有限制，請請網路管理人員協助開放 Paddle 模型下載來源。不要隨意刪除已下載完成的模型。

### Port 8001 已被占用

```powershell
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
```

通常是舊的 OCR Server 尚未關閉。回到原本的 PowerShell 視窗按 `Ctrl+C`，再重新執行 `start.ps1`。本專案正式流程固定使用 8001，不建議只改其中一邊的 port。

### Next.js 無法連到 OCR Server

依序檢查：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
Select-String -Path .\.env -Pattern "OCR_API_URL"
```

`.env` 應指向 `http://127.0.0.1:8001`。修改後要重新啟動 Next.js。

### OCR 等待約 30 秒，看起來像沒有反應

CPU 辨識需要時間。先查看 OCR Server 視窗是否仍在處理；完整回應時間可能因電腦負載超過 30 秒。專案的 OCR request timeout 為 180 秒，不要在等待期間重複上傳同一張圖片。

### 如何再次確認使用 CPU

```powershell
& .\.venv\Scripts\python.exe .\servers\ocr\check_env.py
```

確認 `目前裝置` 為 `cpu`、`純 CPU 套件` 為 `True`。

## 相關文件

- [GPU 部署狀態說明](deployment-gpu.zh-TW.md)
- [使用者操作手冊](user-guide.zh-TW.md)
