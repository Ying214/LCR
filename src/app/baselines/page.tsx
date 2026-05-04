"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { BaselineListResponse } from "@/lib/api-types";
import type { BaselineProfile } from "@/lib/types";

import { BaselineListTable } from "@/components/baselines/BaselineListTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export default function BaselinesPage() {
  const [baselines, setBaselines] = useState<BaselineProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/baselines");
      const json = (await response.json()) as BaselineListResponse;
      setBaselines(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteBaseline = async (id: string) => {
    const response = await fetch(`/api/baselines/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("刪除失敗，請稍後再試。");
      return;
    }
    await load();
  };

  return (
    <div>
      <PageHeader title="Baseline 管理" description="建立、編輯與維護 baseline 參考檔" />
      <SectionCard title="Baseline 列表">
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link href="/baselines/new">新增 Baseline</Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">載入中...</p>
        ) : baselines.length === 0 ? (
          <EmptyState title="目前尚無 baseline" description="請先新增 baseline 以便分析對照。" />
        ) : (
          <BaselineListTable baselines={baselines} onDelete={deleteBaseline} />
        )}
      </SectionCard>
    </div>
  );
}
