import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const result = await prisma.measurementRecord.updateMany({
      data: {
        ocrTracking: Prisma.JsonNull,
      },
    });

    return NextResponse.json({
      message: "OCR Accuracy 紀錄已清除。",
      clearedRecordCount: result.count,
    });
  } catch {
    return NextResponse.json({ message: "清除 OCR Accuracy 紀錄失敗。" }, { status: 500 });
  }
}
