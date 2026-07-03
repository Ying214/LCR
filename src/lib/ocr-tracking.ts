export const OCR_TRACKING_EPSILON = 1e-8;

export type OcrTrackingFieldKey = "freqHz" | "level" | "rp" | "cp" | "rs" | "cs";

export type OcrInitialSnapshot = Partial<Record<OcrTrackingFieldKey, number>>;

export type OcrTrackingField = {
  field: OcrTrackingFieldKey;
  initialValue: number;
  finalValue: number | null;
  wasModified: boolean;
};

export type OcrRecordTracking = {
  trackedFieldCount: number;
  acceptedFieldCount: number;
  correctedFieldCount: number;
  adoptionRate: number;
  fields: OcrTrackingField[];
};

export function areNearlyEqual(left: number, right: number, epsilon = OCR_TRACKING_EPSILON): boolean {
  const diff = Math.abs(left - right);
  if (diff <= epsilon) {
    return true;
  }
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return diff <= epsilon * scale;
}

export function buildOcrRecordTracking(
  initialSnapshot: OcrInitialSnapshot | null | undefined,
  finalValues: Partial<Record<OcrTrackingFieldKey, number | null>>,
  epsilon = OCR_TRACKING_EPSILON,
): OcrRecordTracking | null {
  if (!initialSnapshot) {
    return null;
  }

  const fields: OcrTrackingField[] = [];
  const keys: OcrTrackingFieldKey[] = ["freqHz", "level", "rp", "cp", "rs", "cs"];

  for (const key of keys) {
    const initialValue = initialSnapshot[key];
    if (typeof initialValue !== "number" || !Number.isFinite(initialValue)) {
      continue;
    }

    const finalValue = finalValues[key];
    if (typeof finalValue === "number" && Number.isFinite(finalValue)) {
      fields.push({
        field: key,
        initialValue,
        finalValue,
        wasModified: !areNearlyEqual(initialValue, finalValue, epsilon),
      });
      continue;
    }

    fields.push({
      field: key,
      initialValue,
      finalValue: null,
      wasModified: true,
    });
  }

  const trackedFieldCount = fields.length;
  if (trackedFieldCount === 0) {
    return null;
  }

  const correctedFieldCount = fields.filter((field) => field.wasModified).length;
  const acceptedFieldCount = trackedFieldCount - correctedFieldCount;
  const adoptionRate = acceptedFieldCount / trackedFieldCount;

  return {
    trackedFieldCount,
    acceptedFieldCount,
    correctedFieldCount,
    adoptionRate,
    fields,
  };
}

type RecordWithTracking = {
  ocrTracking?: OcrRecordTracking | null;
};

export type OcrTrackingSummary = {
  trackedRecordCount: number;
  correctRecordCount: number;
  incorrectRecordCount: number;
  accuracyRate: number | null;
  trackedFieldCount: number;
  acceptedFieldCount: number;
  correctedFieldCount: number;
  adoptionRate: number | null;
};

export function summarizeOcrTracking(records: RecordWithTracking[]): OcrTrackingSummary {
  let trackedRecordCount = 0;
  let correctRecordCount = 0;
  let incorrectRecordCount = 0;
  let trackedFieldCount = 0;
  let acceptedFieldCount = 0;
  let correctedFieldCount = 0;

  for (const record of records) {
    const tracking = record.ocrTracking;
    if (!tracking) {
      continue;
    }
    trackedRecordCount += 1;
    if (tracking.correctedFieldCount === 0) {
      correctRecordCount += 1;
    } else {
      incorrectRecordCount += 1;
    }
    trackedFieldCount += tracking.trackedFieldCount;
    acceptedFieldCount += tracking.acceptedFieldCount;
    correctedFieldCount += tracking.correctedFieldCount;
  }

  return {
    trackedRecordCount,
    correctRecordCount,
    incorrectRecordCount,
    accuracyRate: trackedRecordCount > 0 ? correctRecordCount / trackedRecordCount : null,
    trackedFieldCount,
    acceptedFieldCount,
    correctedFieldCount,
    adoptionRate: trackedFieldCount > 0 ? acceptedFieldCount / trackedFieldCount : null,
  };
}
