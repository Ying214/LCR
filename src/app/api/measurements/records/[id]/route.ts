import { NextResponse } from "next/server";

import type { UpdateMeasurementRecordPayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function toNonNegativeNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateMeasurementRecordPayload;

    const data: {
      freqHz?: number;
      level?: number;
      rp?: number;
      cp?: number;
      rs?: number;
      cs?: number;
    } = {};

    const assignIfDefined = <T extends keyof typeof data>(field: T, value: unknown, label: string) => {
      if (value === undefined) {
        return null;
      }
      const parsed = toNonNegativeNumber(value);
      if (parsed === null) {
        return `${label} 必須為大於或等於 0 的數值。`;
      }
      data[field] = parsed;
      return null;
    };

    const freqError = assignIfDefined("freqHz", body.freqHz, "FREQ");
    if (freqError) {
      return NextResponse.json({ message: freqError }, { status: 400 });
    }
    const levelError = assignIfDefined("level", body.level, "LEVEL");
    if (levelError) {
      return NextResponse.json({ message: levelError }, { status: 400 });
    }
    const rpError = assignIfDefined("rp", body.rp, "Rp");
    if (rpError) {
      return NextResponse.json({ message: rpError }, { status: 400 });
    }
    const cpError = assignIfDefined("cp", body.cp, "Cp");
    if (cpError) {
      return NextResponse.json({ message: cpError }, { status: 400 });
    }
    const rsError = assignIfDefined("rs", body.rs, "Rs");
    if (rsError) {
      return NextResponse.json({ message: rsError }, { status: 400 });
    }
    const csError = assignIfDefined("cs", body.cs, "Cs");
    if (csError) {
      return NextResponse.json({ message: csError }, { status: 400 });
    }

    const updated = await prisma.measurementRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ message: "更新 record 失敗。" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const target = await prisma.measurementRecord.findUnique({
      where: { id },
      select: { id: true, datasetId: true },
    });

    if (!target) {
      return NextResponse.json({ message: "找不到該筆 record。" }, { status: 404 });
    }

    const reordered = await prisma.$transaction(async (tx) => {
      await tx.measurementRecord.delete({ where: { id: target.id } });

      const remaining = await tx.measurementRecord.findMany({
        where: { datasetId: target.datasetId },
        select: { id: true },
        orderBy: { indexNo: "asc" },
      });

      for (const [index, record] of remaining.entries()) {
        await tx.measurementRecord.update({
          where: { id: record.id },
          data: { indexNo: 100000 + index + 1 },
        });
      }

      for (const [index, record] of remaining.entries()) {
        await tx.measurementRecord.update({
          where: { id: record.id },
          data: { indexNo: index + 1 },
        });
      }

      return tx.measurementRecord.findMany({
        where: { datasetId: target.datasetId },
        orderBy: { indexNo: "asc" },
      });
    });

    return NextResponse.json({
      message: "Record 已刪除，筆數已重新編號。",
      datasetId: target.datasetId,
      records: reordered,
    });
  } catch {
    return NextResponse.json({ message: "刪除 record 失敗。" }, { status: 500 });
  }
}

