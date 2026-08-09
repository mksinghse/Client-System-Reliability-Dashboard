import { healthLabel, healthTone } from "@/lib/utils";
import type { HealthStatus } from "@/lib/models";

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`badge ${healthTone(status)}`}>
      <span className="dot" />
      {healthLabel(status)}
    </span>
  );
}
