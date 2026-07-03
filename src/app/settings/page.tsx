import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsPagePanel } from "@/components/settings/SettingsPagePanel";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="系統設定" description="管理顯示模式與 OCR 準確率記錄開關。" />
      <SettingsPagePanel />
    </div>
  );
}
