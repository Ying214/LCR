import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_KINDS = new Set(["original", "marked"]);
const ALLOWED_EXTENSIONS = new Map<string, string>([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".bmp", "image/bmp"],
  [".webp", "image/webp"],
]);
const OCR_DATA_ROOT = path.resolve(process.cwd(), "servers", "ocr", "data", "ocr");
const LEGACY_APP_OCR_PREFIX = "/app/data/ocr/";

type OcrMetadataLike = {
  originalImagePath?: string | null;
  markedImagePath?: string | null;
};

function isPathInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveOcrMetadataPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }

  const slashNormalized = trimmed.replace(/\\/g, "/");
  if (slashNormalized.startsWith(LEGACY_APP_OCR_PREFIX)) {
    const relativePath = slashNormalized.slice(LEGACY_APP_OCR_PREFIX.length);
    if (!relativePath) {
      return null;
    }
    return path.resolve(OCR_DATA_ROOT, relativePath);
  }

  if (!path.isAbsolute(trimmed)) {
    return null;
  }

  return path.resolve(trimmed);
}

function logResolveFailure(details: {
  datasetId: string;
  kind: string;
  rawPath: string;
  resolvedPath: string | null;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.warn("[ocr-image] failed to resolve image path", {
    ...details,
    root: OCR_DATA_ROOT,
  });
}

function getOcrMetadata(metadata: unknown): OcrMetadataLike | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const ocr = (metadata as Record<string, unknown>).ocr;
  if (!ocr || typeof ocr !== "object") {
    return null;
  }
  return ocr as OcrMetadataLike;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const kind = (url.searchParams.get("kind") ?? "").toLowerCase();

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ message: "kind 只允許 original 或 marked。" }, { status: 400 });
    }

    const dataset = await prisma.measurementDataset.findUnique({
      where: { id },
      select: { metadata: true },
    });

    if (!dataset) {
      return NextResponse.json({ message: "找不到 dataset。" }, { status: 404 });
    }

    const ocr = getOcrMetadata(dataset.metadata);
    if (!ocr) {
      return NextResponse.json({ message: "該 dataset 沒有 OCR metadata。" }, { status: 404 });
    }

    const rawPath = kind === "original" ? ocr.originalImagePath : ocr.markedImagePath;
    if (!rawPath || typeof rawPath !== "string") {
      return NextResponse.json({ message: "找不到對應圖片路徑。" }, { status: 404 });
    }

    const resolvedPath = resolveOcrMetadataPath(rawPath);
    if (!resolvedPath) {
      logResolveFailure({ datasetId: id, kind, rawPath, resolvedPath });
      return NextResponse.json({ message: "圖片路徑格式不支援。" }, { status: 403 });
    }

    if (!isPathInsideRoot(OCR_DATA_ROOT, resolvedPath)) {
      logResolveFailure({ datasetId: id, kind, rawPath, resolvedPath });
      return NextResponse.json({ message: "圖片路徑不在允許目錄內。" }, { status: 403 });
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    const contentType = ALLOWED_EXTENSIONS.get(extension);
    if (!contentType) {
      return NextResponse.json({ message: "不支援的圖片格式。" }, { status: 404 });
    }

    const realPath = await fs.realpath(resolvedPath).catch(() => null);
    if (!realPath) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ocr-image] image file not found", {
          datasetId: id,
          kind,
          rawPath,
          resolvedPath,
          root: OCR_DATA_ROOT,
        });
      }
      return NextResponse.json({ message: "找不到圖片檔案。" }, { status: 404 });
    }
    if (!isPathInsideRoot(OCR_DATA_ROOT, realPath)) {
      logResolveFailure({ datasetId: id, kind, rawPath, resolvedPath: realPath });
      return NextResponse.json({ message: "圖片路徑不在允許目錄內。" }, { status: 403 });
    }

    const stat = await fs.stat(realPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ message: "找不到圖片檔案。" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(realPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ message: "讀取 OCR 圖片失敗。" }, { status: 500 });
  }
}
