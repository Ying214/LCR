import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

type TrendSectionHeaderProps = {
  title: string;
  description: string;
  collapsed: boolean;
  onToggle: () => void;
  showClearSelection?: boolean;
  clearSelectionDisabled?: boolean;
  onClearSelection?: () => void;
};

export function TrendSectionHeader({
  title,
  description,
  collapsed,
  onToggle,
  showClearSelection = false,
  clearSelectionDisabled = true,
  onClearSelection,
}: TrendSectionHeaderProps) {
  return (
    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {showClearSelection ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={clearSelectionDisabled}
            >
              清除選取
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
            {collapsed ? <ChevronDown /> : <ChevronUp />}
            {collapsed ? "展開" : "收合"}
          </Button>
        </div>
      </div>
    </div>
  );
}
