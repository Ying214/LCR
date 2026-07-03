export type DisplayMode = "standard" | "friendly";

export type AppSettings = {
  displayMode: DisplayMode;
  ocrAccuracyTrackingEnabled: boolean;
};

export const APP_SETTINGS_STORAGE_KEY = "lcr.app-settings.v1";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  displayMode: "standard",
  ocrAccuracyTrackingEnabled: true,
};

export function isDisplayMode(value: unknown): value is DisplayMode {
  return value === "standard" || value === "friendly";
}

export function getClientDefaultServerTrackingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OCR_ACCURACY_TRACKING_ENABLED?.toLowerCase() !== "false";
}
