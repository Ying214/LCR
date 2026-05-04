export function formatNumber(value: number | null | undefined, fractionDigits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${formatNumber(value, fractionDigits)}%`;
}

export function formatFrequency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${formatNumber(value, 0)} Hz`;
}

export function formatLevel(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return formatNumber(value, 3);
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return "--";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
