import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function sortNumberAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export async function GET() {
  const [conditions, frequencies, levels] = await Promise.all([
    prisma.measurementDataset.findMany({
      select: { conditionLabel: true },
      distinct: ["conditionLabel"],
      orderBy: { conditionLabel: "asc" },
    }),
    prisma.measurementRecord.findMany({
      select: { freqHz: true },
      distinct: ["freqHz"],
    }),
    prisma.measurementRecord.findMany({
      select: { level: true },
      distinct: ["level"],
    }),
  ]);

  return NextResponse.json({
    data: {
      conditionLabels: conditions.map((item) => item.conditionLabel),
      frequencies: sortNumberAsc(frequencies.map((item) => item.freqHz)),
      levels: sortNumberAsc(levels.map((item) => item.level)),
    },
  });
}
