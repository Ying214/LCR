import { NextResponse } from "next/server";

import type { UpdateMeasurementDatasetPayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateMeasurementDatasetPayload;

    const data: {
      datasetName?: string;
      conditionLabel?: string;
      note?: string | null;
      baselineId?: string | null;
    } = {};

    if (body.datasetName !== undefined) {
      const datasetName = normalizeOptionalString(body.datasetName);
      if (!datasetName) {
        return NextResponse.json({ message: "資料名稱不可為空白。" }, { status: 400 });
      }
      data.datasetName = datasetName;
    }

    if (body.conditionLabel !== undefined) {
      const conditionLabel = normalizeOptionalString(body.conditionLabel);
      if (!conditionLabel) {
        return NextResponse.json({ message: "製程條件不可為空白。" }, { status: 400 });
      }
      data.conditionLabel = conditionLabel;
    }

    if (body.note !== undefined) {
      data.note = normalizeOptionalString(body.note);
    }

    if (body.baselineId !== undefined) {
      data.baselineId = normalizeOptionalString(body.baselineId);
    }

    const updated = await prisma.measurementDataset.update({
      where: { id },
      data,
      include: {
        baseline: true,
        records: {
          orderBy: { indexNo: "asc" },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ message: "更新 dataset 失敗。" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.measurementDataset.delete({ where: { id } });
    return NextResponse.json({ message: "Dataset 已刪除。" });
  } catch {
    return NextResponse.json({ message: "刪除 dataset 失敗。" }, { status: 500 });
  }
}

