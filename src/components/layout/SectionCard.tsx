import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <Card className="mb-6 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
