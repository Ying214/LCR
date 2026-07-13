# Windows GPU 部署狀態說明

## 目前狀態

🚧 待重新整理與驗證。

本專案原本的開發環境就是 NVIDIA GeForce RTX 4060 搭配 PaddleOCR GPU。開發期間使用真實 LCR 圖片觀察，單張 OCR 約需 3～5 秒；這是當時環境的實際速度，不是對所有顯示卡的效能保證。

GPU 部署本身不是不能使用。目前沒有列為正式交接流程，是因為新手安裝會同時牽涉：

- NVIDIA Driver。
- CUDA。
- cuDNN。
- PaddlePaddle GPU Runtime。
- PaddleOCR GPU。
- RTX 顯示卡世代與相容版本。

這些元件必須使用互相相容的版本。目前尚未重新驗證一套從全新 Windows 電腦開始、可由新手完整重現的安裝流程，所以本文件不提供尚未驗證的安裝指令。

## 現階段怎麼部署

新接手者請先使用已完成真實驗證的 [Windows CPU 部署流程](deployment.zh-TW.md)。CPU 版與目前專案的 FastAPI、Next.js、Prisma / SQLite 流程已完成整合，適合作為正式交接基準。

Intel Core i7-13700 的 CPU 實測約為 30 秒一張。實際速度會依 CPU、圖片大小與背景程式不同而有所差異。

## 後續補文件時要完成的驗證

GPU 文件要升級為正式流程前，至少應重新確認：

- 支援的 Windows、Python 與 RTX 顯示卡範圍。
- Driver、CUDA、cuDNN 與 PaddlePaddle GPU Runtime 的相容組合。
- PaddleOCR pipeline 能以 GPU 初始化並完成真實 LCR 圖片辨識。
- FastAPI、Next.js 與 OCR request timeout 的端到端行為。
- 從乾淨 Windows 環境開始可重複安裝，並留下實際測試結果。

完成這些驗證後，再補上逐步安裝與常見錯誤處理。驗證前請不要把零散的網路指令當作本專案正式流程。

## CPU 與 GPU 的系統流程

CPU 與 GPU 使用相同的 OCR API 與系統流程。GPU 部署完成後，不需要改變系統的操作方式，也不是另一套獨立系統；差別只在 PaddleOCR 使用的推論裝置，主要改善 OCR 推論速度。

## 相關文件

- [Windows CPU 部署（正式支援）](deployment.zh-TW.md)
- [使用者操作手冊](user-guide.zh-TW.md)
