import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import type { HealthStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relativeTime(date?: Date | string | null) {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function healthLabel(status: HealthStatus) {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "WARNING":
      return "Warning";
    case "CRITICAL":
      return "Critical";
    case "OFFLINE":
      return "Offline";
    default:
      return status;
  }
}

export function healthTone(status: HealthStatus) {
  switch (status) {
    case "HEALTHY":
      return "healthy";
    case "WARNING":
      return "warning";
    case "CRITICAL":
      return "critical";
    case "OFFLINE":
      return "offline";
    default:
      return "offline";
  }
}

export function scoreFromCounts(healthy: number, warning: number, critical: number, offline: number) {
  const total = healthy + warning + critical + offline;
  if (total === 0) return 100;
  const weighted = healthy * 100 + warning * 70 + critical * 30 + offline * 10;
  return Math.round(weighted / total);
}

export function statusFromScore(score: number): HealthStatus {
  if (score >= 90) return "HEALTHY";
  if (score >= 70) return "WARNING";
  if (score >= 40) return "CRITICAL";
  return "OFFLINE";
}
