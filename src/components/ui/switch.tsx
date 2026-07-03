"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ id, checked, disabled = false, onCheckedChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }
        onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-sky-600 bg-sky-600" : "border-slate-300 bg-slate-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
