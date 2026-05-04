"use client";

import { useCallback, useState } from "react";

import { DEFAULT_MEASUREMENT_FILTER } from "@/lib/constants";
import type { MeasurementFilter } from "@/lib/types";

export function useMeasurementFilters() {
  const [draftFilters, setDraftFilters] = useState<MeasurementFilter>({
    ...DEFAULT_MEASUREMENT_FILTER,
  });
  const [appliedFilters, setAppliedFilters] = useState<MeasurementFilter>({
    ...DEFAULT_MEASUREMENT_FILTER,
  });

  const applyFilters = () => setAppliedFilters({ ...draftFilters });

  const resetFilters = () => {
    setDraftFilters({ ...DEFAULT_MEASUREMENT_FILTER });
    setAppliedFilters({ ...DEFAULT_MEASUREMENT_FILTER });
  };

  const toSearchParams = useCallback((filters: MeasurementFilter) => {
    const params = new URLSearchParams();

    if (filters.datasetName) {
      params.set("datasetName", filters.datasetName);
    }
    if (filters.conditionLabel) {
      params.set("conditionLabel", filters.conditionLabel);
    }
    if (filters.freqHz) {
      params.set("freqHz", filters.freqHz);
    }
    if (filters.level) {
      params.set("level", filters.level);
    }
    if (filters.baselineId) {
      params.set("baselineId", filters.baselineId);
    }

    return params;
  }, []);

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetFilters,
    toSearchParams,
  };
}
