import { NextResponse } from "next/server";

type ComparePayload = {
  targetCode: string;
  datasetName: string;
  conditionLabel: string;
  sourceLabel: string;
  recordCount: number;
  freqHz: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "Hz";
  };
  level: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "V";
  };
  rp: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "Ω";
  };
  cp: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "F";
  };
  rs: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "Ω";
  };
  cs: {
    rawValue: number | null;
    formattedValue: string;
    baseUnit: "F";
  };
  missingMessages?: string[];
};

type RequestBody = {
  comparisons?: ComparePayload[];
};

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

function buildPrompt(comparisons: ComparePayload[]): string {
  const payloadText = JSON.stringify(comparisons);
  return [
    "請只根據 JSON 內容，輸出繁體中文比較摘要。",
    "摘要長度約 80～150 字，3～5 句，不可臆測。",
    "請只輸出純文字，不要 JSON、不要 markdown code block、不要 ```、不要陣列格式。",
    "欄位說明：rp/rs 是電阻、cp/cs 是電容；formattedValue 已包含可讀單位。",
    "若摘要提到任何數值，必須使用 formattedValue；不要直接輸出 rawValue。",
    "rawValue 只供排序與比較，不可直接顯示，不可自行換算單位。",
    "內容需包含：差異最明顯對象、差異最大參數、是否有缺值、以及需結合製程條件判斷。",
    "JSON:",
    payloadText,
  ].join("\n");
}

function toPlainTextSummary(raw: string): string {
  let text = raw.trim();

  if (!text) {
    return "";
  }

  // Unwrap markdown code fences if model returns fenced content.
  text = text.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/```$/i, "").trim();

  // Try parsing JSON/array output and flatten into plain text.
  if (
    (text.startsWith("[") && text.endsWith("]")) ||
    (text.startsWith("{") && text.endsWith("}"))
  ) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        text = parsed.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
      } else if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if (typeof record.summary === "string") {
          text = record.summary;
        } else {
          text = Object.values(record)
            .map((value) => (typeof value === "string" ? value : ""))
            .filter(Boolean)
            .join("\n");
        }
      }
    } catch {
      // Keep original text if parse fails.
    }
  }

  // Remove markdown list markers / numbering and normalize line breaks.
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(?:[-*]\s+|\d+[\.\)\、]\s+)/gm, "")
    .replace(/([。！？])\s*/g, "$1\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return text;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { message: "尚未設定 Gemini API Key，無法生成 AI 摘要" },
      { status: 400 },
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  try {
    const body = (await request.json()) as RequestBody;
    const comparisons = Array.isArray(body.comparisons) ? body.comparisons : [];
    if (comparisons.length === 0) {
      return NextResponse.json({ message: "缺少可用的比較資料。" }, { status: 400 });
    }

    const prompt = buildPrompt(comparisons);
    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: 2048,
      ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    };

    console.log("[dashboard-compare/summary] model:", model);
    console.log("[dashboard-compare/summary] comparisons count:", comparisons.length);
    console.log("[dashboard-compare/summary] prompt length:", prompt.length);
    console.log("[dashboard-compare/summary] generationConfig:", generationConfig);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig,
        }),
      },
    );

    const json = (await geminiResponse.json().catch(() => null)) as GeminiResponse | null;
    const finishReasons = json?.candidates?.map((candidate) => candidate.finishReason ?? "UNKNOWN") ?? [];
    console.log("[dashboard-compare/summary] Gemini HTTP status:", geminiResponse.status);
    console.log("[dashboard-compare/summary] finish reasons:", finishReasons.join(", ") || "none");
    console.log("[dashboard-compare/summary] usage metadata:", json?.usageMetadata ?? null);
    if (!geminiResponse.ok) {
      return NextResponse.json({ message: "Gemini API 呼叫失敗，請稍後再試。" }, { status: 502 });
    }

    if (finishReasons.includes("MAX_TOKENS")) {
      return NextResponse.json(
        { message: "AI 摘要生成被截斷，請調整模型或 token 設定。" },
        { status: 502 },
      );
    }

    const allParts =
      json?.candidates?.flatMap((candidate) =>
        candidate.content?.parts?.map((part) => part.text ?? "") ?? [],
      ) ?? [];

    const rawSummary = allParts.join("\n").trim();
    console.log("[dashboard-compare/summary] extracted parts count:", allParts.length);

    if (!rawSummary) {
      return NextResponse.json({ message: "Gemini 未回傳摘要內容。" }, { status: 502 });
    }

    const summary = toPlainTextSummary(rawSummary);
    if (!summary) {
      return NextResponse.json({ message: "AI 摘要格式無法解析為純文字。" }, { status: 502 });
    }

    console.log("[dashboard-compare/summary] final summary length:", summary.length);
    console.log("[dashboard-compare/summary] final summary preview:", summary.slice(0, 200));

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ message: "生成 AI 摘要失敗。" }, { status: 500 });
  }
}
