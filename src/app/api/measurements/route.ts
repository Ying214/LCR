import { NextResponse } from "next/server";

import type { CreateMeasurementDatasetPayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetName = searchParams.get("datasetName");
  const conditionLabel = searchParams.get("conditionLabel");
  const freqHz = toNumber(searchParams.get("freqHz"));
  const level = toNumber(searchParams.get("level"));
  const baselineId = searchParams.get("baselineId");

  const datasets = await prisma.measurementDataset.findMany({
    where: {
      datasetName: datasetName ? { contains: datasetName } : undefined,
      conditionLabel: conditionLabel || undefined,
      baselineId: baselineId || undefined,
      records: freqHz || level ? { some: { freqHz: freqHz ?? undefined, level: level ?? undefined } } : undefined,
    },
    include: {
      baseline: true,
      records: {
        where: {
          freqHz: freqHz ?? undefined,
          level: level ?? undefined,
        },
        orderBy: { indexNo: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: datasets });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMeasurementDatasetPayload;

    if (!body.datasetName?.trim()) {
      return NextResponse.json({ message: "資料名稱為必填。" }, { status: 400 });
    }
    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ message: "至少需要一筆量測明細。" }, { status: 400 });
    }

    const indexSet = new Set<number>();
    for (const record of body.records) {
      if (indexSet.has(record.indexNo)) {
        return NextResponse.json(
          { message: "同一組資料內，筆數不可重複。", field: "indexNo" },
          { status: 400 },
        );
      }
      indexSet.add(record.indexNo);
    }

    const createdDataset = await prisma.$transaction(async (tx) => {
      const dataset = await tx.measurementDataset.create({
        data: {
          datasetName: body.datasetName.trim(),
          conditionLabel: body.conditionLabel?.trim() ?? "",
          note: body.note?.trim() || null,
          baselineId: body.baselineId || null,
        },
      });

      await tx.measurementRecord.createMany({
        data: body.records.map((record) => ({
          datasetId: dataset.id,
          indexNo: record.indexNo,
          freqHz: record.freqHz,
          level: record.level,
          rp: record.rp,
          cp: record.cp,
          rs: record.rs,
          cs: record.cs,
        })),
      });

      return tx.measurementDataset.findUnique({
        where: { id: dataset.id },
        include: { baseline: true, records: { orderBy: { indexNo: "asc" } } },
      });
    });

    return NextResponse.json({ data: createdDataset }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "建立量測資料失敗。" }, { status: 500 });
  }
}
