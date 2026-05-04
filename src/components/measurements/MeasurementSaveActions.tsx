import { Button } from "@/components/ui/button";

type MeasurementSaveActionsProps = {
  onSave: () => Promise<void>;
  isSaving: boolean;
};

export function MeasurementSaveActions({ onSave, isSaving }: MeasurementSaveActionsProps) {
  return (
    <div className="mt-4">
      <Button type="button" onClick={onSave} disabled={isSaving}>
        {isSaving ? "儲存中..." : "儲存"}
      </Button>
    </div>
  );
}
