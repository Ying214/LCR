# 部署說明

本文件說明如何在本機或內部環境部署 LCR OCR Dashboard 與 OCR API。使用者操作流程請參考 [使用者操作手冊](user-guide.zh-TW.md)。

## 前置需求

- Node.js 20 LTS 或相容版本。
- npm。本專案包含 `package-lock.json`，建議使用 npm 安裝依賴。
- Docker Desktop 或 Docker Engine。
- NVIDIA GPU 與可用的 Docker GPU runtime。OCR API 目前在程式中使用 `device="gpu:0"`。
- 可寫入的本機檔案系統，用於 SQLite database 與 OCR runtime data。

## Docker Desktop 安裝

Docker Desktop 官方下載頁：

https://www.docker.com/products/docker-desktop/

安裝後請確認 Docker CLI 可使用：

```bash
docker --version
docker images
```

如需使用 GPU container，請依作業系統與顯示卡環境確認 NVIDIA driver 與 NVIDIA Container Toolkit。RTX 50 系列、CUDA、PaddlePaddle wheel 相容性請優先參考 PaddleOCR / PaddlePaddle 官方文件，不在本文件中固定指定安裝方式。

## PaddleOCR 官方文件

PaddleOCR 官方文件：

https://www.paddleocr.ai/v3.4.1/

PaddleOCR Installation：

https://www.paddleocr.ai/v3.4.1/version3.x/installation.html

官方文件說明 PaddlePaddle 可透過 Docker 或 pip 安裝，並列出 CPU / GPU 版本、driver 需求與 PaddleOCR 安裝方式。本專案 OCR 建置主要參考上述官方文件。

## PaddleOCR 安裝

依 PaddleOCR v3.4.1 Installation 文件，若直接在 Python 環境安裝 PaddleOCR，官方文件列出下列方式：

```bash
python -m pip install paddleocr
```

若需要完整功能依賴，官方文件也列出 `all` extra：

```bash
python -m pip install "paddleocr[all]"
```

PaddlePaddle CPU / GPU 版本與 driver 需求請以官方 Installation 文件為準。

## 本專案版本

【本專案補充】

本專案目前 OCR Dockerfile 位於：

```text
servers/ocr/Dockerfile
```

目前 Dockerfile 使用 PaddlePaddle 官方 GPU image：

```dockerfile
ccr-2vdh3abv-pub.cnc.bj.baidubce.com/paddlepaddle/paddle:3.0.0-gpu-cuda12.6-cudnn9.5-trt10.5
```

並安裝 `servers/ocr/requirements.txt`：

```text
paddleocr
fastapi
uvicorn
python-multipart
opencv-python-headless
pillow
PyYAML==6.0.2
```

本專案開發時曾測試下列版本調整：

```bash
pip uninstall paddleocr paddlex -y
pip install "paddleocr[all]==3.2.0"

pip uninstall langchain langchain-core langchain-community -y
pip install langchain==0.0.354
```

若 Dockerfile 或 `requirements.txt` 已固定版本，請以專案檔案為準。若需要調整 PaddleOCR / PaddlePaddle 版本，請同步確認 OCR API 是否仍可啟動與解析圖片。

## 環境變數

請從專案根目錄複製環境變數範本：

Linux / macOS / Git Bash：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

重要設定：

```env
LCR_PORT=3100
LCR_HOST=127.0.0.1
DATABASE_URL="file:./dev.db"
OCR_API_URL="http://localhost:8001"
OCR_API_TIMEOUT_MS="30000"
OCR_ACCURACY_TRACKING_ENABLED=true
NEXT_PUBLIC_OCR_ACCURACY_TRACKING_ENABLED=true
```

說明：

- `LCR_PORT`：Next.js Dashboard 主機 port，預設 `3100`。
- `LCR_HOST`：Next.js 綁定 host，預設 `127.0.0.1`。
- `DATABASE_URL`：Prisma / SQLite database 位置。
- `OCR_API_URL`：Next.js server-side API routes 呼叫 OCR API 的位址。
- `OCR_API_TIMEOUT_MS`：Next.js 呼叫 OCR API 的逾時時間。
- `OCR_ACCURACY_TRACKING_ENABLED`：server 端 OCR tracking 預設開關。
- `NEXT_PUBLIC_OCR_ACCURACY_TRACKING_ENABLED`：client 端 OCR tracking 預設開關。

## Dashboard 安裝與啟動

安裝依賴：

```bash
npm install
```

初始化 Prisma：

```bash
npm run prisma:generate
npm run prisma:migrate
```

啟動開發伺服器：

```bash
npm run dev
```

預設網址：

```text
http://localhost:3100
```

Production build：

```bash
npm run build
npm run start
```

## OCR Docker Build

從專案根目錄建立 OCR image：

```bash
docker build -t lcr-ocr -f servers/ocr/Dockerfile servers/ocr
```

說明：

- `docker build`：建立 Docker image。
- `-t lcr-ocr`：將 image 命名為 `lcr-ocr`。
- `-f servers/ocr/Dockerfile`：指定 Dockerfile 路徑。
- `servers/ocr`：指定 build context，讓 Dockerfile 可複製 OCR API 相關檔案。

確認 image：

```bash
docker images
```

應可看到 `lcr-ocr`。

## OCR Docker Run

PowerShell：

```powershell
cd servers/ocr
docker run --rm --gpus all --name lcr-ocr-api -p 8001:8000 -v ${PWD}:/app lcr-ocr
```

Git Bash：

```bash
cd servers/ocr
docker run --rm --gpus all --name lcr-ocr-api -p 8001:8000 -v "$(pwd)":/app lcr-ocr
```

參數說明：

- `docker run`：啟動 container。
- `--rm`：container 停止後自動移除。
- `--gpus all`：讓 container 使用可用 GPU。OCR API 目前使用 `device="gpu:0"`。
- `--name lcr-ocr-api`：container 名稱。
- `-p 8001:8000`：將主機 port `8001` 對應到 container 內 uvicorn port `8000`。
- `-v ${PWD}:/app` 或 `-v "$(pwd)":/app`：將目前的 `servers/ocr` 目錄掛載到 container 內 `/app`。
- `lcr-ocr`：要啟動的 Docker image。

如果主機 `8001` 被占用，可改左側主機 port，例如：

```bash
docker run --rm --gpus all --name lcr-ocr-api -p 8010:8000 -v "$(pwd)":/app lcr-ocr
```

同時必須修改 `.env`：

```env
OCR_API_URL="http://localhost:8010"
```

如果未使用主機呼叫，而是在 Docker Compose 內部服務互相呼叫，`OCR_API_URL` 通常不能使用 `localhost`，需改成 service name，例如：

```env
OCR_API_URL="http://lcr-ocr-api:8000"
```

## OCR API 測試

OCR API 目前提供：

- `GET /`：回傳服務訊息。
- `GET /health`：回傳健康狀態。
- `POST /ocr`：接收 `file` 欄位圖片並執行 OCR。

健康檢查：

```bash
curl http://localhost:8001/health
```

預期回應：

```json
{"status":"ok"}
```

Next.js Dashboard 會透過 `/api/ocr` 轉呼叫 `OCR_API_URL/ocr`。

## OCR Runtime Data

【本專案補充】

OCR API 執行後會將資料寫入 `servers/ocr/data/`，包含：

- 原始上傳圖片。
- OCR raw JSON。
- OCR 標記圖。
- 每次 OCR 執行的 metadata。

`.gitignore` 已排除 `servers/ocr/data/`，這些 runtime data 不應提交到 GitHub。

## 常見問題

### Docker 指令無法執行

請確認 Docker Desktop 已啟動，並執行：

```bash
docker --version
docker images
```

### OCR API 連不上

請檢查：

- OCR container 是否正在執行。
- `docker run -p` 的主機 port 是否與 `.env` 的 `OCR_API_URL` 一致。
- Dashboard 是否使用正確 `.env`。
- Docker Compose 內部服務是否誤用 `localhost`。

### Port 被占用

Dashboard port 可修改：

```env
LCR_PORT=3200
```

OCR API 主機 port 可修改 `-p` 左側：

```bash
-p 8010:8000
```

並同步修改：

```env
OCR_API_URL="http://localhost:8010"
```

### GPU 找不到

請確認 NVIDIA driver、Docker GPU runtime 與 PaddlePaddle / PaddleOCR 官方版本相容性。RTX 50 系列與 CUDA 相關安裝方式請以 PaddleOCR / PaddlePaddle 官方文件為準。

可先測試 Docker 是否能看到 GPU：

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

### PaddleOCR 版本相容問題

請先確認 `servers/ocr/Dockerfile` 與 `servers/ocr/requirements.txt`。若需要改版本，請參考 PaddleOCR Installation 文件，並重新 build OCR image。

### `.env` 設定錯誤

請確認：

- `DATABASE_URL` 指向可寫入的 SQLite database。
- `OCR_API_URL` 對應 OCR API 實際 port。
- 修改 `.env` 後重新啟動 Next.js。
