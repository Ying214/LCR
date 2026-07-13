import "server-only";

const DEFAULT_OCR_API_URL = "http://127.0.0.1:8001";
const DEFAULT_OCR_API_TIMEOUT_MS = 120_000;

function normalizeBaseUrl(rawValue: string | undefined): string {
  const value = rawValue?.trim() || DEFAULT_OCR_API_URL;
  return value.replace(/\/+$/, "");
}

function parseTimeoutMs(rawValue: string | undefined): number {
  if (!rawValue?.trim()) {
    return DEFAULT_OCR_API_TIMEOUT_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OCR_API_TIMEOUT_MS;
  }

  return Math.floor(parsed);
}

export function getOcrApiConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.OCR_API_URL),
    timeoutMs: parseTimeoutMs(process.env.OCR_API_TIMEOUT_MS),
  };
}
