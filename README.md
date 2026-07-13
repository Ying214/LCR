# LCR 量測資料 OCR 與分析系統

## 專案介紹

本專案用來讀取 LCR Meter 量測圖片中的 FREQ、LEVEL、Rp、Cp、Rs、Cs。OCR 結果會先帶入表格供人員確認，再存入 Dataset，後續可進行 Baseline 比較、圖表分析與報告匯出。

## 主要功能

- 使用 PaddleOCR PP-OCRv5 辨識 LCR 量測圖片。
- 解析六個量測欄位並統一單位。
- 管理 Dataset、Baseline 與 OCR 修正紀錄。
- 比較多組資料並匯出 PDF、PNG、ZIP 與 CSV。

## 系統架構

```text
瀏覽器
  |
  v
Next.js / React（127.0.0.1:3100）
  |
  v
FastAPI / PaddleOCR（127.0.0.1:8001）
  |
  v
PaddlePaddle CPU + Prisma / SQLite
```

## 部署方式

- [Windows CPU 部署（正式支援）](docs/deployment.zh-TW.md)
- [Windows GPU 部署（待重新整理與驗證）](docs/deployment-gpu.zh-TW.md)

Windows CPU 部署已完成整理與驗證，適合作為正式交接流程。GPU 開發環境已有實際使用經驗，但部署教學仍待重新整理與驗證。若想了解 CPU 與 GPU 的效能差異，請參考部署文件。

## 快速開始

### 第一次安裝

先依 [Windows CPU 部署文件](docs/deployment.zh-TW.md) 完成 Git、Node.js、Python、`.env`、`.venv`、PaddleOCR 與 Prisma 的一次性安裝。

### 每天啟動

在專案目錄開啟兩個 PowerShell 視窗。

PowerShell 1：

```powershell
& .\servers\ocr\start.ps1
```

PowerShell 2：

```powershell
npm run dev
```

瀏覽器開啟 `http://127.0.0.1:3100`。日常啟動不用重建 `.venv`、重裝套件或重新執行 Prisma migration。

## 文件

- [CPU 部署](docs/deployment.zh-TW.md)
- [GPU 部署](docs/deployment-gpu.zh-TW.md)
- [使用者手冊](docs/user-guide.zh-TW.md)
