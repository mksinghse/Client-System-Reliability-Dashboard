import { healthLabel, healthTone } from "@/lib/utils";
import type { HealthStatus } from "@prisma/client";

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`badge ${healthTone(status)}`}>
      <span className="dot" />
      {healthLabel(status)}
    </span>
  );
}
