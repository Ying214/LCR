import type { OcrLine, OcrServiceResponse } from "@/lib/api-types";
import type { CapacitanceUnit, FrequencyUnit, ResistanceUnit } from "@/lib/types";

export type ParsedMeasurementRecord = {
  freqHz: string;
  level: string;
  rp: string;
  cp: string;
  rs: string;
  cs: string;
  freqUnit: FrequencyUnit;
  rpUnit: ResistanceUnit;
  cpUnit: CapacitanceUnit;
  rsUnit: ResistanceUnit;
  csUnit: CapacitanceUnit;
  freqScore: number | null;
  levelScore: number | null;
  rpScore: number | null;
  cpScore: number | null;
  rsScore: number | null;
  csScore: number | null;
};

type OcrToken = {
  text: string;
  x: number;
  y: number;
  score: number | null;
  dtScore: number | null;
};

type NumberCandidate = {
  text: string;
  value: number;
  x: number;
  sourceText: string;
  score: number | null;
  dtScore: number | null;
};

type ParameterKey = "rp" | "cp" | "rs" | "cs";

type WorkingRow = ParsedMeasurementRecord & {
  sortFreq: number;
  sortLevel: number;
};

const ROW_GROUP_Y_THRESHOLD = 16;
const DEFAULT_ROW_UNITS = {
  freqUnit: "khz" as const,
  rpUnit: "kohm" as const,
  cpUnit: "nf" as const,
  rsUnit: "ohm" as const,
  csUnit: "nf" as const,
};

function parseBoxCenter(box: unknown): { x: number; y: number } | null {
  if (!Array.isArray(box) || box.length === 0) {
    return null;
  }

  if (box.every((item) => typeof item === "number")) {
    const raw = box as number[];
    if (raw.length >= 4) {
      return {
        x: (raw[0] + raw[2]) / 2,
        y: (raw[1] + raw[3]) / 2,
      };
    }
    return null;
  }

  if (box.every((item) => Array.isArray(item) && item.length >= 2)) {
    const points = (box as unknown[]).filter(Array.isArray) as number[][];
    if (points.length === 0) {
      return null;
    }
    const sum = points.reduce(
      (acc, point) => ({
        x: acc.x + Number(point[0] ?? 0),
        y: acc.y + Number(point[1] ?? 0),
      }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  return null;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function collectTokens(lines: OcrLine[]): OcrToken[] {
  return lines
    .map((line) => {
      const text = normalizeText(line.text ?? "");
      const center = parseBoxCenter(line.box);
      if (!text || !center) {
        return null;
      }
      return {
        text,
        x: center.x,
        y: center.y,
        score: typeof line.score === "number" ? line.score : null,
        dtScore: typeof line.dt_score === "number" ? line.dt_score : null,
      };
    })
    .filter((item): item is OcrToken => item !== null);
}

function extractNumberCandidates(tokens: OcrToken[]): NumberCandidate[] {
  const candidates: NumberCandidate[] = [];
  const numberPattern = /[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g;

  for (const token of tokens) {
    const matches = token.text.match(numberPattern);
    if (!matches || matches.length === 0) {
      continue;
    }

    for (const match of matches) {
      const parsed = Number(match);
      if (!Number.isFinite(parsed)) {
        continue;
      }
      candidates.push({
        text: match,
        value: parsed,
        x: token.x,
        sourceText: token.text,
        score: token.score,
        dtScore: token.dtScore,
      });
    }
  }

  return candidates;
}

function detectHeaderX(tokens: OcrToken[], pattern: RegExp): number | null {
  const matched = tokens.filter((token) => pattern.test(token.text.toUpperCase()));
  if (matched.length === 0) {
    return null;
  }
  return matched.reduce((sum, item) => sum + item.x, 0) / matched.length;
}

function detectParameterKey(tokens: OcrToken[]): ParameterKey | null {
  for (const token of tokens) {
    const normalized = token.text.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized === "rp") {
      return "rp";
    }
    if (normalized === "cp") {
      return "cp";
    }
    if (normalized === "rs") {
      return "rs";
    }
    if (normalized === "cs") {
      return "cs";
    }
  }
  return null;
}

function detectFreqUnit(text: string): FrequencyUnit {
  const normalized = text.toLowerCase();
  if (normalized.includes("khz")) {
    return "khz";
  }
  if (normalized.includes("hz")) {
    return "hz";
  }
  return DEFAULT_ROW_UNITS.freqUnit;
}

function detectResistanceUnit(text: string): ResistanceUnit {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("mohm") || normalized.includes("mω")) {
    return "mohm";
  }
  if (normalized.includes("kohm") || normalized.includes("kω")) {
    return "kohm";
  }
  if (normalized.includes("ohm") || normalized.includes("ω")) {
    return "ohm";
  }
  return "ohm";
}

function detectCapacitanceUnit(text: string): CapacitanceUnit {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("pf")) {
    return "pf";
  }
  if (normalized.includes("nf")) {
    return "nf";
  }
  if (normalized.includes("uf")) {
    return "uf";
  }
  if (normalized.includes("mf")) {
    return "mf";
  }
  if (normalized.includes("f")) {
    return "f";
  }
  return "nf";
}

function pickNearestCandidate(
  candidates: NumberCandidate[],
  targetX: number | null,
  usedIndexes: Set<number>,
): { candidate: NumberCandidate | null; index: number | null } {
  if (candidates.length === 0) {
    return { candidate: null, index: null };
  }

  if (targetX === null) {
    const index = candidates.findIndex((_, idx) => !usedIndexes.has(idx));
    if (index === -1) {
      return { candidate: null, index: null };
    }
    return { candidate: candidates[index], index };
  }

  let bestIndex: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < candidates.length; i += 1) {
    if (usedIndexes.has(i)) {
      continue;
    }
    const distance = Math.abs(candidates[i].x - targetX);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  if (bestIndex === null) {
    return { candidate: null, index: null };
  }

  return { candidate: candidates[bestIndex], index: bestIndex };
}

function initializeWorkingRow(freq: NumberCandidate, level: NumberCandidate): WorkingRow {
  const freqUnit = detectFreqUnit(freq.sourceText);
  const freqScore = typeof freq.score === "number" ? freq.score : freq.dtScore;
  const levelScore = typeof level.score === "number" ? level.score : level.dtScore;

  return {
    freqHz: freq.text,
    level: level.text,
    rp: "",
    cp: "",
    rs: "",
    cs: "",
    freqUnit,
    rpUnit: DEFAULT_ROW_UNITS.rpUnit,
    cpUnit: DEFAULT_ROW_UNITS.cpUnit,
    rsUnit: DEFAULT_ROW_UNITS.rsUnit,
    csUnit: DEFAULT_ROW_UNITS.csUnit,
    freqScore: typeof freqScore === "number" ? freqScore : null,
    levelScore: typeof levelScore === "number" ? levelScore : null,
    rpScore: null,
    cpScore: null,
    rsScore: null,
    csScore: null,
    sortFreq: freq.value,
    sortLevel: level.value,
  };
}

function getAllLines(ocrResponse: OcrServiceResponse): OcrLine[] {
  if (Array.isArray(ocrResponse.lines) && ocrResponse.lines.length > 0) {
    return ocrResponse.lines;
  }
  return ocrResponse.results.flatMap((result) => result.lines ?? []);
}

function createRowKey(freq: NumberCandidate, level: NumberCandidate): string {
  return `${freq.value}|${level.value}`;
}

function resolveCandidateScore(candidate: NumberCandidate): number | null {
  if (typeof candidate.score === "number") {
    return candidate.score;
  }
  if (typeof candidate.dtScore === "number") {
    return candidate.dtScore;
  }
  return null;
}

function shouldReplaceScore(previous: number | null, next: number | null): boolean {
  if (previous === null) {
    return true;
  }
  if (next === null) {
    return false;
  }
  return next > previous;
}

export function extractMeasurementRecordsFromOcr(ocrResponse: OcrServiceResponse): ParsedMeasurementRecord[] {
  const lines = getAllLines(ocrResponse);
  const tokens = collectTokens(lines).sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  if (tokens.length === 0) {
    return [];
  }

  const freqHeaderX = detectHeaderX(tokens, /FREQ/);
  const levelHeaderX = detectHeaderX(tokens, /LEVEL/);
  const measHeaderX = detectHeaderX(tokens, /MEAS(\.|\s*)VAL|MEAS/);

  const groupedRows: Array<{ y: number; tokens: OcrToken[] }> = [];
  for (const token of tokens) {
    const lastGroup = groupedRows[groupedRows.length - 1];
    if (!lastGroup || Math.abs(token.y - lastGroup.y) > ROW_GROUP_Y_THRESHOLD) {
      groupedRows.push({ y: token.y, tokens: [token] });
      continue;
    }
    lastGroup.tokens.push(token);
    lastGroup.y = (lastGroup.y + token.y) / 2;
  }

  const rowMap = new Map<string, WorkingRow[]>();
  let lastParameter: ParameterKey | null = null;

  for (const grouped of groupedRows) {
    const rowTokens = grouped.tokens.sort((a, b) => a.x - b.x);
    const numberCandidates = extractNumberCandidates(rowTokens);
    if (numberCandidates.length < 3) {
      continue;
    }

    const explicitParameter = detectParameterKey(rowTokens);
    if (explicitParameter) {
      lastParameter = explicitParameter;
    }
    const parameter = explicitParameter ?? lastParameter;
    if (!parameter) {
      continue;
    }

    const usedIndexes = new Set<number>();
    let freqPick = pickNearestCandidate(numberCandidates, freqHeaderX, usedIndexes);
    if (!freqPick.candidate || freqPick.index === null) {
      freqPick = pickNearestCandidate(numberCandidates, null, usedIndexes);
    }
    if (!freqPick.candidate || freqPick.index === null) {
      continue;
    }
    usedIndexes.add(freqPick.index);

    let levelPick = pickNearestCandidate(numberCandidates, levelHeaderX, usedIndexes);
    if (!levelPick.candidate || levelPick.index === null) {
      levelPick = pickNearestCandidate(numberCandidates, null, usedIndexes);
    }
    if (!levelPick.candidate || levelPick.index === null) {
      continue;
    }
    usedIndexes.add(levelPick.index);

    let valuePick = pickNearestCandidate(numberCandidates, measHeaderX, usedIndexes);
    if (!valuePick.candidate || valuePick.index === null) {
      const fallbackIndex = numberCandidates.length - 1;
      if (!usedIndexes.has(fallbackIndex)) {
        valuePick = { candidate: numberCandidates[fallbackIndex], index: fallbackIndex };
      }
    }
    if (!valuePick.candidate) {
      continue;
    }

    const rowKey = createRowKey(freqPick.candidate, levelPick.candidate);
    const rowsForKey = rowMap.get(rowKey) ?? [];
    let activeRow = rowsForKey[rowsForKey.length - 1] ?? null;

    if (!activeRow) {
      activeRow = initializeWorkingRow(freqPick.candidate, levelPick.candidate);
      rowsForKey.push(activeRow);
    } else if (parameter === "rp") {
      const hasCpRsCs = Boolean(activeRow.cp || activeRow.rs || activeRow.cs);
      if (hasCpRsCs) {
        activeRow = initializeWorkingRow(freqPick.candidate, levelPick.candidate);
        rowsForKey.push(activeRow);
      }
    }

    rowMap.set(rowKey, rowsForKey);
    const valueScore = resolveCandidateScore(valuePick.candidate);

    if (parameter === "rp") {
      if (!activeRow.rp || shouldReplaceScore(activeRow.rpScore, valueScore)) {
        activeRow.rp = valuePick.candidate.text;
        activeRow.rpUnit = detectResistanceUnit(valuePick.candidate.sourceText);
        activeRow.rpScore = valueScore;
      }
    } else if (parameter === "rs") {
      if (!activeRow.rs || shouldReplaceScore(activeRow.rsScore, valueScore)) {
        activeRow.rs = valuePick.candidate.text;
        activeRow.rsUnit = detectResistanceUnit(valuePick.candidate.sourceText);
        activeRow.rsScore = valueScore;
      }
    } else if (parameter === "cp") {
      if (!activeRow.cp || shouldReplaceScore(activeRow.cpScore, valueScore)) {
        activeRow.cp = valuePick.candidate.text;
        activeRow.cpUnit = detectCapacitanceUnit(valuePick.candidate.sourceText);
        activeRow.cpScore = valueScore;
      }
    } else if (parameter === "cs") {
      if (!activeRow.cs || shouldReplaceScore(activeRow.csScore, valueScore)) {
        activeRow.cs = valuePick.candidate.text;
        activeRow.csUnit = detectCapacitanceUnit(valuePick.candidate.sourceText);
        activeRow.csScore = valueScore;
      }
    }
  }

  return Array.from(rowMap.values())
    .flat()
    .sort((a, b) => (a.sortFreq === b.sortFreq ? a.sortLevel - b.sortLevel : a.sortFreq - b.sortFreq))
    .map((row) => ({
      freqHz: row.freqHz,
      level: row.level,
      rp: row.rp,
      cp: row.cp,
      rs: row.rs,
      cs: row.cs,
      freqUnit: row.freqUnit,
      rpUnit: row.rpUnit,
      cpUnit: row.cpUnit,
      rsUnit: row.rsUnit,
      csUnit: row.csUnit,
      freqScore: row.freqScore,
      levelScore: row.levelScore,
      rpScore: row.rpScore,
      cpScore: row.cpScore,
      rsScore: row.rsScore,
      csScore: row.csScore,
    }));
}
