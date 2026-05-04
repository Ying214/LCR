import { NextResponse } from "next/server";

import type { CreateBaselinePayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const baselines = await prisma.baselineProfile.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: baselines });
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBaselinePayload;

    if (!body.name?.trim()) {
      return NextResponse.json({ message: "Baseline 名稱為必填。" }, { status: 400 });
    }

    const created = await prisma.baselineProfile.create({
      data: {
        name: body.name.trim(),
        conditionLabel: body.conditionLabel?.trim() || null,
        note: body.note?.trim() || null,
        freqHz: toNumberOrNull(body.freqHz),
        level: toNumberOrNull(body.level),
        rp: toNumberOrNull(body.rp),
        cp: toNumberOrNull(body.cp),
        rs: toNumberOrNull(body.rs),
        cs: toNumberOrNull(body.cs),
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "建立 baseline 失敗。" }, { status: 500 });
  }
}
