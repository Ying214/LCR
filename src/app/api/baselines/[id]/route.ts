import { NextResponse } from "next/server";

import type { UpdateBaselinePayload } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const baseline = await prisma.baselineProfile.findUnique({ where: { id } });

  if (!baseline) {
    return NextResponse.json({ message: "找不到 baseline。" }, { status: 404 });
  }
  return NextResponse.json({ data: baseline });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateBaselinePayload;

    const updated = await prisma.baselineProfile.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        conditionLabel: body.conditionLabel?.trim() || null,
        note: body.note?.trim() || null,
        freqHz: body.freqHz === undefined ? undefined : toNumberOrNull(body.freqHz),
        level: body.level === undefined ? undefined : toNumberOrNull(body.level),
        rp: body.rp === undefined ? undefined : toNumberOrNull(body.rp),
        cp: body.cp === undefined ? undefined : toNumberOrNull(body.cp),
        rs: body.rs === undefined ? undefined : toNumberOrNull(body.rs),
        cs: body.cs === undefined ? undefined : toNumberOrNull(body.cs),
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ message: "更新 baseline 失敗。" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.baselineProfile.delete({ where: { id } });
    return NextResponse.json({ message: "Baseline 已刪除。" });
  } catch {
    return NextResponse.json({ message: "刪除 baseline 失敗。" }, { status: 500 });
  }
}
