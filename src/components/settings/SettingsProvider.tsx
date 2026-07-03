"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  getClientDefaultServerTrackingEnabled,
  isDisplayMode,
  type AppSettings,
  type DisplayMode,
} from "@/lib/app-settings";

type SettingsContextValue = {
  settings: AppSettings;
  serverTrackingEnabled: boolean;
  effectiveOcrAccuracyTrackingEnabled: boolean;
  setDisplayMode: (mode: DisplayMode) => void;
  setOcrAccuracyTrackingEnabled: (enabled: boolean) => void;
  setServerTrackingEnabled: (enabled: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function parseStoredSettings(raw: string): AppSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const nextDisplayMode = isDisplayMode(parsed.displayMode)
      ? parsed.displayMode
      : DEFAULT_APP_SETTINGS.displayMode;
    const nextTracking =
      typeof parsed.ocrAccuracyTrackingEnabled === "boolean"
        ? parsed.ocrAccuracyTrackingEnabled
        : DEFAULT_APP_SETTINGS.ocrAccuracyTrackingEnabled;
    return {
      displayMode: nextDisplayMode,
      ocrAccuracyTrackingEnabled: nextTracking,
    };
  } catch {
    return null;
  }
}

type SettingsProviderProps = {
  children: ReactNode;
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_APP_SETTINGS;
    }
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }
    return parseStoredSettings(raw) ?? DEFAULT_APP_SETTINGS;
  });
  const [serverTrackingEnabled, setServerTrackingEnabled] = useState<boolean>(
    getClientDefaultServerTrackingEnabled(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setSettings((prev) => ({ ...prev, displayMode: mode }));
  }, []);

  const setOcrAccuracyTrackingEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, ocrAccuracyTrackingEnabled: enabled }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      serverTrackingEnabled,
      effectiveOcrAccuracyTrackingEnabled:
        serverTrackingEnabled && settings.ocrAccuracyTrackingEnabled,
      setDisplayMode,
      setOcrAccuracyTrackingEnabled,
      setServerTrackingEnabled,
    }),
    [serverTrackingEnabled, setDisplayMode, setOcrAccuracyTrackingEnabled, settings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within SettingsProvider");
  }
  return context;
}
