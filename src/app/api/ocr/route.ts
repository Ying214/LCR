import { NextResponse } from "next/server";

import { getOcrApiConfig } from "@/lib/ocr-config";
import type { OcrServiceResponse } from "@/lib/api-types";

type OcrErrorResponse = {
  message: string;
  details?: unknown;
};

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isOcrTrackingEnabled(): boolean {
  return process.env.OCR_ACCURACY_TRACKING_ENABLED?.toLowerCase() !== "false";
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json<OcrErrorResponse>({ message: "請提供 file 欄位的圖片檔案。" }, { status: 400 });
  }

  const upstreamFormData = new FormData();
  upstreamFormData.append("file", file, file.name);

  const { baseUrl, timeoutMs } = getOcrApiConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  console.info("[ocr-proxy] request start", {
    filename: file.name,
    upstreamUrl: `${baseUrl}/ocr`,
    timeoutMs,
  });

  try {
    const upstreamResponse = await fetch(`${baseUrl}/ocr`, {
      method: "POST",
      body: upstreamFormData,
      signal: controller.signal,
    });

    const rawBody = await upstreamResponse.text();
    console.info("[ocr-proxy] response received", {
      filename: file.name,
      status: upstreamResponse.status,
      elapsedMs: Date.now() - requestStartedAt,
    });
    const parsedBody = parseJsonSafely(rawBody);

    if (!upstreamResponse.ok) {
      return NextResponse.json<OcrErrorResponse>(
        {
          message: `OCR service 回傳錯誤（${upstreamResponse.status}）。`,
          details: parsedBody ?? rawBody,
        },
        { status: 502 },
      );
    }

    if (parsedBody === null) {
      return NextResponse.json<OcrErrorResponse>(
        { message: "OCR service 回傳非 JSON 格式，請檢查服務狀態。" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...(parsedBody as OcrServiceResponse),
      ocrAccuracyTrackingEnabled: isOcrTrackingEnabled(),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[ocr-proxy] timeout in Next.js API route AbortController", {
        filename: file.name,
        timeoutMs,
        elapsedMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json<OcrErrorResponse>(
        { message: `OCR service 請求逾時（${timeoutMs}ms）。` },
        { status: 504 },
      );
    }
    console.error("[ocr-proxy] upstream request failed", {
      filename: file.name,
      elapsedMs: Date.now() - requestStartedAt,
      error,
    });
    return NextResponse.json<OcrErrorResponse>(
      { message: "無法連線 OCR service，請確認服務是否啟動。" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
