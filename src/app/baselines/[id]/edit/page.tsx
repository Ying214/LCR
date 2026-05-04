"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { BaselineFormValue } from "@/components/baselines/BaselineForm";
import { BaselineForm } from "@/components/baselines/BaselineForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import type { CreateBaselinePayload } from "@/lib/api-types";
import type { BaselineProfile } from "@/lib/types";

function toFormValue(data: BaselineProfile): BaselineFormValue {
  const freqValue = data.freqHz;
  const useKHz = typeof freqValue === "number" && freqValue % 1000 === 0;

  return {
    name: data.name,
    conditionLabel: data.conditionLabel ?? "",
    freqHz: typeof freqValue === "number"
      ? useKHz
        ? (freqValue / 1000).toString()
        : freqValue.toString()
      : "",
    freqUnit: useKHz ? "khz" : "hz",
    level: data.level?.toString() ?? "",
    rp: data.rp?.toString() ?? "",
    rpUnit: "ohm",
    cp: data.cp?.toString() ?? "",
    cpUnit: "f",
    rs: data.rs?.toString() ?? "",
    rsUnit: "ohm",
    cs: data.cs?.toString() ?? "",
    csUnit: "f",
    note: data.note ?? "",
  };
}

export default function EditBaselinePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [initialValue, setInitialValue] = useState<BaselineFormValue | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      const response = await fetch(`/api/baselines/${id}`);
      if (!response.ok) {
        alert("載入 baseline 失敗。");
        router.push("/baselines");
        return;
      }
      const json = (await response.json()) as { data: BaselineProfile };
      setInitialValue(toFormValue(json.data));
    };

    void load();
  }, [id, router]);

  const updateBaseline = async (payload: CreateBaselinePayload) => {
    if (!id) {
      return;
    }
    const response = await fetch(`/api/baselines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      alert(error.message ?? "更新 baseline 失敗。");
      return;
    }

    alert("Baseline 已更新。");
    router.push("/baselines");
  };

  return (
    <div>
      <PageHeader title="編輯 Baseline" description="更新 baseline 參考數值與說明。" />
      <SectionCard title="Baseline 編輯">
        {initialValue ? (
          <BaselineForm initialValue={initialValue} submitLabel="更新 Baseline" onSubmit={updateBaseline} />
        ) : (
          <p className="text-sm text-slate-500">載入中...</p>
        )}
      </SectionCard>
    </div>
  );
}
