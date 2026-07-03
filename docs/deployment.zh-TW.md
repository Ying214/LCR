# LCR OCR Dashboard 部署說明

這份文件給部署與維護者閱讀，說明如何安裝 Dashboard、啟動 OCR API、設定 port / env，以及處理 GPU、Docker 與 PaddleOCR 相容性問題。

## 1. 本機開發部署

### 1.1 安裝 Node.js

建議使用 Node.js 20 LTS。本專案目前以 Node.js v20.20.2 驗證。

### 1.2 安裝依賴

本專案使用 npm 與 `package-lock.json`：

```bash
npm install
```

### 1.3 設定 `.env`

複製範本：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

重要設定：

```bash
LCR_PORT=3100
LCR_HOST=127.0.0.1
DATABASE_URL="file:./dev.db"
OCR_API_URL="http://localhost:8001"
OCR_API_TIMEOUT_MS="30000"
```

### 1.4 初始化資料庫

```bash
npm run prisma:generate
npm run prisma:migrate
```

如需示範資料：

```bash
npm run db:seed
```

### 1.5 啟動 Dashboard

```bash
npm run dev
```

預設網址：

```text
http://localhost:3100
```

`scripts/next-runner.mjs` 會讀取 `LCR_PORT` / `LCR_HOST`；若改 port，請以 `.env` 實際值為準。

### 1.6 啟動 OCR API

開發時可用 Docker 啟動 OCR API，詳見下一節。

## 2. Docker OCR API 部署

### 2.1 Build image

從專案根目錄執行：

```bash
docker build -t lcr-ocr -f servers/ocr/Dockerfile servers/ocr
```

或切到 OCR 目錄：

```bash
cd servers/ocr
docker build -t lcr-ocr .
```

### 2.2 啟動 container

以下指令請在 `servers/ocr` 目錄執行，因為 `-v ${PWD}:/app` 需要讓 `/app/main.py` 對應到 OCR API 程式碼。

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

### 2.3 Port mapping

`-p 8001:8000` 代表：

- `8001`：主機 port，使用者可依環境修改。
- `8000`：container 內 uvicorn port，由 `servers/ocr/Dockerfile` 的 CMD 設定。

如果主機 port 改成 8010：

```bash
docker run --rm --gpus all --name lcr-ocr-api -p 8010:8000 -v ${PWD}:/app lcr-ocr
```

同時要修改 Dashboard `.env`：

```bash
OCR_API_URL="http://localhost:8010"
```

### 2.4 Volume mapping

OCR API 會在 `servers/ocr/data/` 下儲存：

- 上傳圖片
- OCR 原始 JSON
- OCR 標記圖片
- OCR run folder

`.gitignore` 已排除 `servers/ocr/data/`，避免把 runtime data 上傳到 GitHub。

如果部署環境不想將資料寫在專案目錄，可以把 volume 改成其他主機目錄，但要確認 Next.js API 讀取 OCR metadata 圖片 / JSON 時仍能找到對應路徑。

### 2.5 GPU 注意事項

目前 `servers/ocr/main.py` 使用：

```python
device="gpu:0"
```

因此 OCR API 預設需要 NVIDIA GPU。請先確認 Docker 可看到 GPU：

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

若此指令失敗，請先修 NVIDIA driver、Docker Desktop GPU 支援或 NVIDIA Container Toolkit。

## 3. RTX 50 系列 GPU 注意事項

目前專案內沒有針對 RTX 50 系列 GPU 的特殊設定，也沒有明確宣告已支援 RTX 50 系列。

保守部署建議：

- RTX 50 系列通常需要較新的 NVIDIA driver、CUDA runtime、PaddlePaddle / PaddleOCR 相容版本。
- 若遇到 GPU 初始化失敗，先確認 `nvidia-smi` 是否正常。
- 再確認 Docker GPU 測試是否通過：

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

- 如果 PaddleOCR GPU 套件不支援目前 CUDA / GPU 架構，可能需要改用相容 PaddlePaddle image、調整 PaddleOCR / paddlex 版本，或暫時規劃 CPU 模式。
- 不要假設 RTX 50 系列已可直接使用；請以實機 build 與 OCR smoke test 為準。

## 4. 一般 NVIDIA GPU 部署

一般 NVIDIA GPU 部署步驟：

1. 安裝或更新 NVIDIA driver。
2. 安裝 Docker。
3. 安裝 NVIDIA Container Toolkit / 啟用 Docker GPU 支援。
4. 執行 GPU 測試：

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

5. Build OCR image：

```bash
docker build -t lcr-ocr -f servers/ocr/Dockerfile servers/ocr
```

6. 啟動 OCR API：

```bash
cd servers/ocr
docker run --rm --gpus all --name lcr-ocr-api -p 8001:8000 -v ${PWD}:/app lcr-ocr
```

7. 設定 Dashboard `.env`：

```bash
OCR_API_URL="http://localhost:8001"
```

8. 啟動 Dashboard：

```bash
npm run dev
```

## 5. CPU 模式

目前專案尚未整理 CPU 模式。

原因：

- `servers/ocr/main.py` 固定 `device="gpu:0"`。
- `servers/ocr/Dockerfile` 使用 PaddlePaddle GPU image。
- 目前沒有 CPU 專用 Dockerfile 或環境變數可以切換 device。

若要支援 CPU，需要另外調整：

- PaddleOCR 初始化參數。
- Docker base image / requirements。
- 部署文件與 smoke test。

在完成上述調整前，請視為 OCR API 需要 NVIDIA GPU。

## 6. Port 與環境變數

### Dashboard

```bash
LCR_PORT=3100
LCR_HOST=127.0.0.1
```

- `LCR_PORT` 是 Dashboard / Next.js 主機 port。
- 預設 Dashboard 網址：`http://localhost:3100`。
- 如果 port 被占用，可改成 `LCR_PORT=3200`。

### OCR API

```bash
OCR_API_URL="http://localhost:8001"
OCR_API_TIMEOUT_MS="30000"
```

- `OCR_API_URL` 是 Next.js server-side API routes 呼叫 OCR API 的位置。
- 如果 OCR API 用 `-p 8010:8000`，請改成 `OCR_API_URL="http://localhost:8010"`。
- Docker Compose 內部服務互相呼叫時，通常要用 service name，例如 `http://lcr-ocr-api:8000`，不要直接用 `localhost`。

### OCR 準確率記錄

```bash
OCR_ACCURACY_TRACKING_ENABLED=true
NEXT_PUBLIC_OCR_ACCURACY_TRACKING_ENABLED=true
```

- `OCR_ACCURACY_TRACKING_ENABLED`：Next.js server 端是否回傳 OCR tracking 開關。
- `NEXT_PUBLIC_OCR_ACCURACY_TRACKING_ENABLED`：前端初始顯示用設定。

## 7. PaddleOCR / LangChain 版本

專案背景曾參考 PaddleOCR 官方安裝方式，並曾因版本相容性固定：

```bash
pip install "paddleocr[all]==3.2.0"
pip install langchain==0.0.354
```

目前實際檔案狀態：

- `servers/ocr/requirements.txt` 仍是未釘版的 `paddleocr`。
- 專案程式碼目前沒有直接 import `langchain`。

若部署時遇到 PaddleOCR / paddlex 相容問題，建議先在測試分支釘定 `servers/ocr/requirements.txt` 版本，重新 build image 後做 OCR smoke test。

## 8. 常見部署問題

### Port 被占用

Dashboard：

```bash
LCR_PORT=3200
```

OCR API：

```bash
docker run --rm --gpus all --name lcr-ocr-api -p 8010:8000 -v ${PWD}:/app lcr-ocr
```

並同步修改：

```bash
OCR_API_URL="http://localhost:8010"
```

### Container name 重複

若出現 container name 已存在，先查看：

```bash
docker ps -a
```

停止或移除舊 container：

```bash
docker stop lcr-ocr-api
docker rm lcr-ocr-api
```

若使用 `--rm` 且 container 正常退出，通常不會殘留。

### OCR API 連不上

請檢查：

- OCR container 是否正在執行。
- `curl http://localhost:8001/health` 是否成功。
- Dashboard `.env` 的 `OCR_API_URL` 是否正確。
- Docker Compose 內部是否誤用 `localhost`。
- 防火牆或部署平台是否阻擋 port。

### GPU 找不到

請先執行：

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

若失敗，先處理 NVIDIA driver、NVIDIA Container Toolkit 或 Docker GPU 支援。

### PaddleOCR 版本錯誤

常見處理方向：

- 檢查 `servers/ocr/requirements.txt`。
- 檢查 PaddlePaddle base image CUDA 版本。
- 依實際 GPU / CUDA / Python 環境釘定 PaddleOCR / paddlex。
- 重新 build image。

### `.env` 沒設定或設定錯

常見症狀：

- Dashboard port 不是預期的 `3100`。
- OCR API 可用，但 Dashboard 顯示無法連線 OCR。
- Prisma 找不到資料庫。

請確認 `.env` 至少包含：

```bash
LCR_PORT=3100
DATABASE_URL="file:./dev.db"
OCR_API_URL="http://localhost:8001"
```

## 9. GitHub 上傳前檢查清單

- `.env.example` 要提交，`.env` / `.env.local` 不要提交。
- `.gitignore` 要排除 `.next/`、`node_modules/`、SQLite db、OCR runtime data。
- `servers/ocr/data/` 不要提交。
- 若需要示範資料，可使用 `prisma/seed.ts` 與 `npm run db:seed`。
- README 要說明 Dashboard port 與 OCR API port。
- README 要說明 OCR image build 方式。
- README / user guide 要說明 PNG / JSON / CSV 匯出功能。
- 目前沒有 LICENSE；公開前建議補授權條款。
- 目前沒有 screenshots；未來建議補 Dashboard 與 OCR 操作截圖。

