import { store } from "./ddb/store";
import { parseCollectorOutput } from "./collector-parser";
import { newId, nowIso } from "./ddb/ids";

export async function ingestCollectorUpload(opts: {
  clientId: string;
  fileName: string;
  raw: string;
  uploadedById?: string;
}) {
  const upload = await store.createUpload({
    clientId: opts.clientId,
    fileName: opts.fileName,
    fileSize: Buffer.byteLength(opts.raw, "utf8"),
    status: "PROCESSING",
    rawPayload: opts.raw,
    uploadedById: opts.uploadedById,
  });

  try {
    const parsed = parseCollectorOutput(opts.raw);

    for (const table of parsed.tables) {
      await store.upsertHardwareTable(opts.clientId, {
        tableName: table.tableName,
        tableCode: table.tableCode,
        status: table.status,
        firmwareVer: table.firmwareVer,
        appVersion: table.appVersion,
        osInfo: table.osInfo,
        cpuUsage: table.cpuUsage,
        memoryUsage: table.memoryUsage,
        storageUsage: table.storageUsage,
        networkInfo: table.networkInfo,
        serviceStatus: table.serviceStatus,
        lastSeenAt: nowIso(),
        peripherals: (table.peripherals ?? []).map((p) => ({
          id: newId("per"),
          tableId: "",
          name: p.name,
          type: p.type,
          status: p.status,
          details: p.details,
        })),
        logs: (table.logs ?? []).map((l) => ({
          id: newId("log"),
          tableId: "",
          level: String(l.level),
          category: l.category,
          message: l.message,
          occurredAt: l.occurredAt ?? nowIso(),
        })),
      });
    }

    await store.replaceFindings(
      opts.clientId,
      parsed.findings.map((f) => ({
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        tableCode: f.tableCode,
      })),
    );

    const allTables = await store.listTables(opts.clientId);
    const healthy = allTables.filter((t) => t.status === "HEALTHY").length;
    const warning = allTables.filter((t) => t.status === "WARNING").length;
    const critical = allTables.filter((t) => t.status === "CRITICAL").length;
    const offline = allTables.filter((t) => t.status === "OFFLINE").length;
    const score =
      allTables.length === 0
        ? 100
        : Math.round((healthy * 100 + warning * 70 + critical * 30 + offline * 10) / allTables.length);

    await store.updateClient(opts.clientId, {
      tableCount: allTables.length,
      criticalIssues: critical,
      warningIssues: warning,
      healthScore: score,
      healthStatus:
        score >= 90 ? "HEALTHY" : score >= 70 ? "WARNING" : score >= 40 ? "CRITICAL" : "OFFLINE",
      availabilityPct:
        Math.round(((healthy + warning * 0.85) / Math.max(allTables.length, 1)) * 1000) / 10,
      lastUploadAt: nowIso(),
      environment: parsed.payload.environment ?? undefined,
    });

    await store.createSnapshot({
      clientId: opts.clientId,
      healthScore: score,
      healthy,
      warning,
      critical,
      offline,
    });

    const done = await store.updateUpload(upload, {
      status: "SUCCESS",
      parsedTables: parsed.counts.total,
      processedAt: nowIso(),
    });

    await store.createAudit({
      userId: opts.uploadedById,
      action: "COLLECTOR_UPLOAD",
      entityType: "CollectorUpload",
      entityId: upload.id,
      details: `Parsed ${parsed.counts.total} tables for client ${opts.clientId}`,
    });

    const client = await store.getClientById(opts.clientId);
    return { ...done, client };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest error";
    await store.updateUpload(upload, {
      status: "FAILED",
      errorMessage: message,
      processedAt: nowIso(),
    });
    throw error;
  }
}
