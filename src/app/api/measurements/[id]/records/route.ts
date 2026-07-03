import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import type { AppendMeasurementRecordsPayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function toOcrTrackingInput(
  value: AppendMeasurementRecordsPayload["records"][number]["ocrTracking"],
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as AppendMeasurementRecordsPayload;

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ message: "至少需要一筆量測明細。" }, { status: 400 });
    }

    const dataset = await prisma.measurementDataset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dataset) {
      return NextResponse.json({ message: "找不到指定的資料集。" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const lastRecord = await tx.measurementRecord.findFirst({
        where: { datasetId: id },
        orderBy: { indexNo: "desc" },
        select: { indexNo: true },
      });
      const startIndex = (lastRecord?.indexNo ?? 0) + 1;

      await tx.measurementRecord.createMany({
        data: body.records.map((record, offset) => ({
          datasetId: id,
          indexNo: startIndex + offset,
          freqHz: record.freqHz,
          level: record.level,
          rp: record.rp,
          cp: record.cp,
          rs: record.rs,
          cs: record.cs,
          freqRawValue: record.freqRawValue ?? null,
          freqRawUnit: record.freqRawUnit ?? null,
          levelRawValue: record.levelRawValue ?? null,
          levelRawUnit: record.levelRawUnit ?? null,
          rpRawValue: record.rpRawValue ?? null,
          rpRawUnit: record.rpRawUnit ?? null,
          cpRawValue: record.cpRawValue ?? null,
          cpRawUnit: record.cpRawUnit ?? null,
          rsRawValue: record.rsRawValue ?? null,
          rsRawUnit: record.rsRawUnit ?? null,
          csRawValue: record.csRawValue ?? null,
          csRawUnit: record.csRawUnit ?? null,
          ocrTracking: toOcrTrackingInput(record.ocrTracking),
        })),
      });

      const records = await tx.measurementRecord.findMany({
        where: { datasetId: id },
        orderBy: { indexNo: "asc" },
      });
      return {
        appendedCount: body.records.length,
        records,
      };
    });

    return NextResponse.json({
      message: "量測明細已加入既有資料集。",
      datasetId: id,
      appendedCount: result.appendedCount,
      records: result.records,
    });
  } catch {
    return NextResponse.json({ message: "加入既有資料集失敗。" }, { status: 500 });
  }
}
