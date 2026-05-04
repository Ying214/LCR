import type { CapacitanceUnit, FrequencyUnit, ResistanceUnit } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";

export const RESISTANCE_UNIT_FACTORS: Record<ResistanceUnit, number> = {
  ohm: 1,
  kohm: 1e3,
  mohm: 1e6,
};

export const CAPACITANCE_UNIT_FACTORS: Record<CapacitanceUnit, number> = {
  f: 1,
  mf: 1e-3,
  uf: 1e-6,
  nf: 1e-9,
  pf: 1e-12,
};

export const FREQUENCY_UNIT_FACTORS: Record<FrequencyUnit, number> = {
  hz: 1,
  khz: 1e3,
};

export const RESISTANCE_UNIT_OPTIONS: Array<{ value: ResistanceUnit; label: string }> = [
  { value: "ohm", label: "Ω" },
  { value: "kohm", label: "kΩ" },
  { value: "mohm", label: "MΩ" },
];

export const CAPACITANCE_UNIT_OPTIONS: Array<{ value: CapacitanceUnit; label: string }> = [
  { value: "f", label: "F" },
  { value: "mf", label: "mF" },
  { value: "uf", label: "uF" },
  { value: "nf", label: "nF" },
  { value: "pf", label: "pF" },
];

export const FREQUENCY_UNIT_OPTIONS: Array<{ value: FrequencyUnit; label: string }> = [
  { value: "hz", label: "Hz" },
  { value: "khz", label: "kHz" },
];

export function resistanceToOhm(value: number, unit: ResistanceUnit): number {
  return value * RESISTANCE_UNIT_FACTORS[unit];
}

export function capacitanceToFarad(value: number, unit: CapacitanceUnit): number {
  return value * CAPACITANCE_UNIT_FACTORS[unit];
}

export function frequencyToHz(value: number, unit: FrequencyUnit): number {
  return value * FREQUENCY_UNIT_FACTORS[unit];
}

export function toEditableFrequency(valueInHz: number): { value: number; unit: FrequencyUnit } {
  if (Math.abs(valueInHz) >= FREQUENCY_UNIT_FACTORS.khz) {
    return { value: valueInHz / FREQUENCY_UNIT_FACTORS.khz, unit: "khz" };
  }
  return { value: valueInHz, unit: "hz" };
}

export function toEditableResistance(valueInOhm: number): { value: number; unit: ResistanceUnit } {
  const absolute = Math.abs(valueInOhm);
  if (absolute >= RESISTANCE_UNIT_FACTORS.mohm) {
    return { value: valueInOhm / RESISTANCE_UNIT_FACTORS.mohm, unit: "mohm" };
  }
  if (absolute >= RESISTANCE_UNIT_FACTORS.kohm) {
    return { value: valueInOhm / RESISTANCE_UNIT_FACTORS.kohm, unit: "kohm" };
  }
  return { value: valueInOhm, unit: "ohm" };
}

export function toEditableCapacitance(valueInFarad: number): { value: number; unit: CapacitanceUnit } {
  const absolute = Math.abs(valueInFarad);
  if (absolute >= CAPACITANCE_UNIT_FACTORS.f) {
    return { value: valueInFarad, unit: "f" };
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.mf) {
    return { value: valueInFarad / CAPACITANCE_UNIT_FACTORS.mf, unit: "mf" };
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.uf) {
    return { value: valueInFarad / CAPACITANCE_UNIT_FACTORS.uf, unit: "uf" };
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.nf) {
    return { value: valueInFarad / CAPACITANCE_UNIT_FACTORS.nf, unit: "nf" };
  }
  return { value: valueInFarad / CAPACITANCE_UNIT_FACTORS.pf, unit: "pf" };
}

export function formatResistance(valueInOhm: number | null | undefined): string {
  if (valueInOhm === null || valueInOhm === undefined || Number.isNaN(valueInOhm)) {
    return "--";
  }

  const absolute = Math.abs(valueInOhm);
  if (absolute >= RESISTANCE_UNIT_FACTORS.mohm) {
    return `${formatNumber(valueInOhm / RESISTANCE_UNIT_FACTORS.mohm, 6)} MΩ`;
  }
  if (absolute >= RESISTANCE_UNIT_FACTORS.kohm) {
    return `${formatNumber(valueInOhm / RESISTANCE_UNIT_FACTORS.kohm, 6)} kΩ`;
  }
  return `${formatNumber(valueInOhm, 6)} Ω`;
}

export function formatCapacitance(valueInFarad: number | null | undefined): string {
  if (valueInFarad === null || valueInFarad === undefined || Number.isNaN(valueInFarad)) {
    return "--";
  }

  const absolute = Math.abs(valueInFarad);
  if (absolute >= CAPACITANCE_UNIT_FACTORS.f) {
    return `${formatNumber(valueInFarad, 6)} F`;
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.mf) {
    return `${formatNumber(valueInFarad / CAPACITANCE_UNIT_FACTORS.mf, 6)} mF`;
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.uf) {
    return `${formatNumber(valueInFarad / CAPACITANCE_UNIT_FACTORS.uf, 6)} uF`;
  }
  if (absolute >= CAPACITANCE_UNIT_FACTORS.nf) {
    return `${formatNumber(valueInFarad / CAPACITANCE_UNIT_FACTORS.nf, 6)} nF`;
  }
  return `${formatNumber(valueInFarad / CAPACITANCE_UNIT_FACTORS.pf, 6)} pF`;
}

export function formatFrequencyWithUnit(valueInHz: number | null | undefined): string {
  if (valueInHz === null || valueInHz === undefined || Number.isNaN(valueInHz)) {
    return "--";
  }

  const absolute = Math.abs(valueInHz);
  if (absolute >= FREQUENCY_UNIT_FACTORS.khz) {
    return `${formatNumber(valueInHz / FREQUENCY_UNIT_FACTORS.khz, 3)} kHz`;
  }
  return `${formatNumber(valueInHz, 3)} Hz`;
}
