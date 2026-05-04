import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  colorClass?: string;
  footer?: ReactNode;
};

export function KpiCard({ title, value, colorClass, footer }: KpiCardProps) {
  return (
    <Card className={cn("border-slate-200 shadow-sm", colorClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-mono text-2xl font-semibold text-slate-900">{value}</p>
        {footer ? <div className="text-sm text-slate-500">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
