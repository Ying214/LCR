import { PageHeader } from "@/components/layout/PageHeader";
import { MeasurementManagementPage } from "@/components/measurements/MeasurementManagementPage";

export default function MeasurementsPage() {
  return (
    <div>
      <PageHeader
        title="量測資料管理"
        description="查看、分組管理與維護 measurement datasets 與 records"
      />
      <MeasurementManagementPage />
    </div>
  );
}
