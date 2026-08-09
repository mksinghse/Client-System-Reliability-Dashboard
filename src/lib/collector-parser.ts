import { z } from "zod";
import type { HealthStatus } from "@/lib/models";
import { scoreFromCounts, statusFromScore } from "./utils";

const peripheralSchema = z.object({
  name: z.string(),
  type: z.string().default("Unknown"),
  status: z.string().default("OK"),
  details: z.string().optional(),
});

const logSchema = z.object({
  level: z.enum(["INFO", "WARN", "ERROR", "EXCEPTION"]).or(z.string()),
  category: z.string().default("General"),
  message: z.string(),
  occurredAt: z.string().datetime().optional(),
});

const tableSchema = z.object({
  tableName: z.string(),
  tableCode: z.string(),
  status: z.enum(["HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]).optional(),
  firmwareVer: z.string().optional(),
  appVersion: z.string().optional(),
  osInfo: z.string().optional(),
  cpuUsage: z.number().min(0).max(100).optional(),
  memoryUsage: z.number().min(0).max(100).optional(),
  storageUsage: z.number().min(0).max(100).optional(),
  networkInfo: z.string().optional(),
  serviceStatus: z.string().optional(),
  peripherals: z.array(peripheralSchema).optional(),
  logs: z.array(logSchema).optional(),
  findings: z
    .array(
      z.object({
        severity: z.enum(["HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]).optional(),
        category: z.string(),
        title: z.string(),
        description: z.string(),
        recommendation: z.string().optional(),
      }),
    )
    .optional(),
});

export const collectorPayloadSchema = z.object({
  collectorVersion: z.string().optional(),
  collectedAt: z.string().optional(),
  clientCode: z.string().optional(),
  environment: z.string().optional(),
  tables: z.array(tableSchema).min(1),
});

export type CollectorPayload = z.infer<typeof collectorPayloadSchema>;

function inferStatus(table: z.infer<typeof tableSchema>): HealthStatus {
  if (table.status) return table.status;
  if (table.serviceStatus?.toLowerCase().includes("stop") || table.serviceStatus?.toLowerCase() === "offline") {
    return "OFFLINE";
  }
  const cpu = table.cpuUsage ?? 0;
  const mem = table.memoryUsage ?? 0;
  const hasError = (table.logs ?? []).some((l) => ["ERROR", "EXCEPTION"].includes(String(l.level).toUpperCase()));
  if (hasError || cpu >= 90 || mem >= 92) return "CRITICAL";
  if (cpu >= 75 || mem >= 80 || (table.logs ?? []).some((l) => String(l.level).toUpperCase() === "WARN")) {
    return "WARNING";
  }
  return "HEALTHY";
}

export type ParsedCollector = {
  payload: CollectorPayload;
  tables: Array<z.infer<typeof tableSchema> & { status: HealthStatus }>;
  counts: { healthy: number; warning: number; critical: number; offline: number; total: number };
  healthScore: number;
  healthStatus: HealthStatus;
  findings: Array<{
    severity: HealthStatus;
    category: string;
    title: string;
    description: string;
    recommendation?: string;
    tableCode: string;
  }>;
};

export function parseCollectorOutput(raw: string): ParsedCollector {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Collector file must be valid JSON");
  }

  const parsed = collectorPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid collector schema: ${parsed.error.issues[0]?.message ?? "validation failed"}`);
  }

  const tables = parsed.data.tables.map((t) => ({ ...t, status: inferStatus(t) }));
  const counts = {
    healthy: tables.filter((t) => t.status === "HEALTHY").length,
    warning: tables.filter((t) => t.status === "WARNING").length,
    critical: tables.filter((t) => t.status === "CRITICAL").length,
    offline: tables.filter((t) => t.status === "OFFLINE").length,
    total: tables.length,
  };
  const healthScore = scoreFromCounts(counts.healthy, counts.warning, counts.critical, counts.offline);
  const healthStatus = statusFromScore(healthScore);

  const findings = tables.flatMap((table) => {
    if (table.findings?.length) {
      return table.findings.map((f) => ({
        severity: (f.severity ?? table.status) as HealthStatus,
        category: f.category,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        tableCode: table.tableCode,
      }));
    }
    if (table.status === "HEALTHY") return [];
    return [
      {
        severity: table.status,
        category: table.status === "OFFLINE" ? "Connectivity" : "Diagnostics",
        title: `${table.tableName} ${table.status.toLowerCase()}`,
        description: `Collector reported ${table.status.toLowerCase()} state for ${table.tableCode}.`,
        recommendation: "Review collector logs and remediate affected peripherals/services.",
        tableCode: table.tableCode,
      },
    ];
  });

  return { payload: parsed.data, tables, counts, healthScore, healthStatus, findings };
}
