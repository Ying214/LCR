import type { BaselineStatus } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/constants";

import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: BaselineStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge className={STATUS_COLORS[status]}>{status}</Badge>;
}
