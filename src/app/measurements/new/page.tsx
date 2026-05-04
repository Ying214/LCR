import { PageHeader } from "@/components/layout/PageHeader";
import { MeasurementForm } from "@/components/measurements/MeasurementForm";

export default function NewMeasurementPage() {
  return (
    <div>
      <PageHeader
        title="新增量測資料"
        description="手動輸入量測資料並寫入資料庫"
      />
      <MeasurementForm />
    </div>
  );
}
