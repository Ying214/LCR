import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import type { OcrLine, OcrServiceResponse } from "@/lib/api-types";
import { extractMeasurementRecordsFromOcr } from "@/lib/ocr-parser";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type OcrMetadataLike = {
  rawJsonPath?: string | null;
};

type OcrRawFailureReason =
  | "dataset_not_found"
  | "missing_ocr_metadata"
  | "missing_raw_path"
  | "invalid_raw_path"
  | "raw_file_not_found"
  | "raw_parse_error";

const LOCAL_ALLOWED_ROOTS = [
  path.resolve(process.cwd(), "servers", "ocr", "data", "ocr"),
  path.resolve(process.cwd(), "servers", "ocr", "data", "uploads"),
  path.resolve(process.cwd(), "servers", "ocr", "data", "json"),
];

const LEGACY_APP_ROOT_MAPPINGS: Array<{ prefix: string; localRoot: string }> = [
  { prefix: "/app/data/ocr/", localRoot: LOCAL_ALLOWED_ROOTS[0] },
  { prefix: "/app/data/uploads/", localRoot: LOCAL_ALLOWED_ROOTS[1] },
  { prefix: "/app/data/json/", localRoot: LOCAL_ALLOWED_ROOTS[2] },
];

function isPathInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isPathInsideAllowedRoots(target: string): boolean {
  return LOCAL_ALLOWED_ROOTS.some((root) => isPathInsideRoot(root, target));
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

function resolveRawPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }

  const slashNormalized = trimmed.replace(/\\/g, "/");
  for (const mapping of LEGACY_APP_ROOT_MAPPINGS) {
    if (slashNormalized.startsWith(mapping.prefix)) {
      const relativePath = slashNormalized.slice(mapping.prefix.length);
      if (!relativePath) {
        return null;
      }
      return path.resolve(mapping.localRoot, relativePath);
    }
  }

  if (!path.isAbsolute(trimmed)) {
    return null;
  }
  return path.resolve(trimmed);
}

function toOcrLinesFromRaw(rawJson: unknown): OcrLine[] {
  const source = rawJson as Record<string, unknown>;

  if (Array.isArray(source.lines)) {
    return source.lines
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const line = item as Record<string, unknown>;
        return {
          text: String(line.text ?? ""),
          score: typeof line.score === "number" ? line.score : null,
          dt_score: typeof line.dt_score === "number" ? line.dt_score : null,
          box: line.box ?? [],
        } satisfies OcrLine;
      });
  }

  if (Array.isArray(source.results)) {
    return source.results
      .flatMap((result) => {
        const resultRecord = result as Record<string, unknown>;
        const lines = resultRecord.lines;
        if (!Array.isArray(lines)) {
          return [];
        }
        return lines;
      })
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const line = item as Record<string, unknown>;
        return {
          text: String(line.text ?? ""),
          score: typeof line.score === "number" ? line.score : null,
          dt_score: typeof line.dt_score === "number" ? line.dt_score : null,
          box: line.box ?? [],
        } satisfies OcrLine;
      });
  }

  const res = source.res as Record<string, unknown> | undefined;
  if (res && Array.isArray(res.rec_texts)) {
    const recTexts = res.rec_texts as unknown[];
    const recScores = Array.isArray(res.rec_scores) ? (res.rec_scores as unknown[]) : [];
    return recTexts.map((text, index) => ({
      text: String(text ?? ""),
      score: typeof recScores[index] === "number" ? (recScores[index] as number) : null,
      dt_score: null,
      box: [],
    }));
  }

  return [];
}

function buildParsedRecords(lines: OcrLine[], rawJson: unknown) {
  const syntheticResponse: OcrServiceResponse = {
    filename: "raw-json",
    result_count: 1,
    lines,
    results: [
      {
        texts: lines.map((line) => line.text),
        average_score: null,
        lines,
        raw: rawJson,
      },
    ],
  };

  const parsed = extractMeasurementRecordsFromOcr(syntheticResponse);
  return parsed.map((row, index) => ({
    rowNo: index + 1,
    freq: `${row.freqHz || "--"} ${row.freqUnit.toUpperCase()}`,
    level: row.level || "--",
    rp: row.rp ? `${row.rp} ${row.rpUnit}` : "--",
    cp: row.cp ? `${row.cp} ${row.cpUnit}` : "--",
    rs: row.rs ? `${row.rs} ${row.rsUnit}` : "--",
    cs: row.cs ? `${row.cs} ${row.csUnit}` : "--",
  }));
}

function failureResponse(reason: OcrRawFailureReason, status = 200) {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const dataset = await prisma.measurementDataset.findUnique({
      where: { id },
      select: { metadata: true },
    });

    if (!dataset) {
      return failureResponse("dataset_not_found", 404);
    }

    const ocr = getOcrMetadata(dataset.metadata);
    if (!ocr) {
      return failureResponse("missing_ocr_metadata");
    }

    if (!ocr.rawJsonPath || typeof ocr.rawJsonPath !== "string") {
      return failureResponse("missing_raw_path");
    }

    const resolvedPath = resolveRawPath(ocr.rawJsonPath);
    if (!resolvedPath) {
      return failureResponse("invalid_raw_path");
    }

    if (!isPathInsideAllowedRoots(resolvedPath)) {
      return failureResponse("invalid_raw_path", 403);
    }

    const realPath = await fs.realpath(resolvedPath).catch(() => null);
    if (!realPath || !isPathInsideAllowedRoots(realPath)) {
      return failureResponse("raw_file_not_found");
    }

    const stat = await fs.stat(realPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return failureResponse("raw_file_not_found");
    }

    const fileContent = await fs.readFile(realPath, "utf8");
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(fileContent);
    } catch {
      return failureResponse("raw_parse_error");
    }

    const lines = toOcrLinesFromRaw(rawJson).filter((line) => line.text.trim() !== "");
    const parsedRecords = buildParsedRecords(lines, rawJson);
    const linesPreview = lines.slice(0, 50).map((line, index) => ({
      lineNo: index + 1,
      text: line.text,
      score: line.score,
    }));

    const rawRoot = rawJson as Record<string, unknown>;
    const rawTextPreview = lines.slice(0, 20).map((line) => line.text).join("\n");

    return NextResponse.json({
      ok: true,
      parsedRecords,
      linesPreview,
      rawTextPreview,
      debug: {
        rawJsonPath: ocr.rawJsonPath,
        resolvedPath: realPath,
        lineCount: lines.length,
        parsedRecordCount: parsedRecords.length,
        topLevelKeys:
          rawRoot && typeof rawRoot === "object"
            ? Object.keys(rawRoot).slice(0, 20)
            : [],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "raw_parse_error" }, { status: 500 });
  }
}
