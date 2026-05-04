"use client";

import { useRouter } from "next/navigation";

import type { CreateBaselinePayload } from "@/lib/api-types";

import { BaselineForm } from "@/components/baselines/BaselineForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";

export default function NewBaselinePage() {
  const router = useRouter();

  const createBaseline = async (payload: CreateBaselinePayload) => {
    const response = await fetch("/api/baselines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      alert(error.message ?? "建立 baseline 失敗。");
      return;
    }

    alert("Baseline 建立成功。");
    router.push("/baselines");
  };

  return (
    <div>
      <PageHeader title="新增 Baseline" description="建立可重複使用的 baseline 參考檔。" />
      <SectionCard title="Baseline 基本資料">
        <BaselineForm submitLabel="儲存 Baseline" enableOcrImport onSubmit={createBaseline} />
      </SectionCard>
    </div>
  );
}
