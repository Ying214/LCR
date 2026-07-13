[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$VenvDir = Join-Path $ProjectRoot ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$CpuRequirements = Join-Path $PSScriptRoot "requirements-paddle.txt"
$ApiRequirements = Join-Path $PSScriptRoot "requirements.txt"
$RequirementsStamp = Join-Path $VenvDir ".lcr-ocr-requirements.sha256"

function Invoke-CheckedPython {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $VenvPython @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

try {
    $PythonCommand = Get-Command python -ErrorAction Stop
} catch {
    Write-Error "找不到 Python。請先安裝 64-bit Python 3.12，安裝時勾選 Add Python to PATH。"
    exit 1
}

& $PythonCommand.Source -c "import platform, sys; ok = (3, 9) <= sys.version_info[:2] <= (3, 13) and platform.architecture()[0] == '64bit'; raise SystemExit(0 if ok else 1)"
if ($LASTEXITCODE -ne 0) {
    Write-Error "需要 64-bit Python 3.9 至 3.13；本專案建議使用 Python 3.12。"
    exit 1
}

if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Host "[LCR OCR] 建立虛擬環境：$VenvDir"
    & $PythonCommand.Source -m venv $VenvDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $VenvPython)) {
        Write-Error "虛擬環境建立失敗。請確認 Python 安裝包含 venv 與 pip。"
        exit 1
    }
}

$RequirementsFingerprint = @(
    (Get-FileHash -LiteralPath $CpuRequirements -Algorithm SHA256).Hash
    (Get-FileHash -LiteralPath $ApiRequirements -Algorithm SHA256).Hash
) -join "`n"

$InstalledFingerprint = if (Test-Path -LiteralPath $RequirementsStamp) {
    (Get-Content -LiteralPath $RequirementsStamp -Raw).Trim()
} else {
    ""
}

if ($InstalledFingerprint -ne $RequirementsFingerprint) {
    Write-Host "[LCR OCR] 第一次安裝或 requirements 已變更，開始安裝固定版本依賴。"
    Write-Host "[LCR OCR] 先從 PaddlePaddle 官方 CPU 套件來源安裝推論引擎。"
    Invoke-CheckedPython -Arguments @("-m", "pip", "install", "-r", $CpuRequirements) -FailureMessage "PaddlePaddle CPU 安裝失敗。請檢查網路連線與 Python 版本。"
    Invoke-CheckedPython -Arguments @("-m", "pip", "install", "-r", $ApiRequirements) -FailureMessage "OCR API 依賴安裝失敗。請查看上方 pip 錯誤訊息。"
    Invoke-CheckedPython -Arguments @("-c", "import paddle; raise SystemExit(0 if not paddle.is_compiled_with_cuda() else 1)") -FailureMessage "目前環境不是純 CPU PaddlePaddle。請刪除 .venv 後依部署文件重新安裝。"
    Set-Content -LiteralPath $RequirementsStamp -Value $RequirementsFingerprint -Encoding ascii
} else {
    Write-Host "[LCR OCR] requirements 未變更，沿用現有虛擬環境。"
}

Invoke-CheckedPython -Arguments @((Join-Path $PSScriptRoot "check_env.py")) -FailureMessage "OCR 執行環境檢查失敗。"

Write-Host "[LCR OCR] 首次啟動會下載 PP-OCRv5 模型，完成前請保持網路連線。"
Write-Host "[LCR OCR] 模型快取：$HOME\.paddlex\official_models"
Write-Host "[LCR OCR] API：http://127.0.0.1:8001"
Write-Host "[LCR OCR] 停止服務：按 Ctrl+C"

Push-Location $PSScriptRoot
try {
    & $VenvPython -m uvicorn main:app --host 127.0.0.1 --port 8001
    if ($LASTEXITCODE -ne 0) {
        throw "OCR API 啟動失敗。請查看上方錯誤訊息。"
    }
} finally {
    Pop-Location
}
