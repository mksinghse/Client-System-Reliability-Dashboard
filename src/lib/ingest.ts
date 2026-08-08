import { prisma } from "./db";
import { parseCollectorOutput } from "./collector-parser";

export async function ingestCollectorUpload(opts: {
  clientId: string;
  fileName: string;
  raw: string;
  uploadedById?: string;
}) {
  const upload = await prisma.collectorUpload.create({
    data: {
      clientId: opts.clientId,
      fileName: opts.fileName,
      fileSize: Buffer.byteLength(opts.raw, "utf8"),
      status: "PROCESSING",
      rawPayload: opts.raw,
      uploadedById: opts.uploadedById,
    },
  });

  try {
    const parsed = parseCollectorOutput(opts.raw);

    await prisma.$transaction(async (tx) => {
      for (const table of parsed.tables) {
        const saved = await tx.hardwareTable.upsert({
          where: {
            clientId_tableCode: {
              clientId: opts.clientId,
              tableCode: table.tableCode,
            },
          },
          create: {
            clientId: opts.clientId,
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
            lastSeenAt: new Date(),
          },
          update: {
            tableName: table.tableName,
            status: table.status,
            firmwareVer: table.firmwareVer,
            appVersion: table.appVersion,
            osInfo: table.osInfo,
            cpuUsage: table.cpuUsage,
            memoryUsage: table.memoryUsage,
            storageUsage: table.storageUsage,
            networkInfo: table.networkInfo,
            serviceStatus: table.serviceStatus,
            lastSeenAt: new Date(),
          },
        });

        await tx.peripheral.deleteMany({ where: { tableId: saved.id } });
        if (table.peripherals?.length) {
          await tx.peripheral.createMany({
            data: table.peripherals.map((p) => ({
              tableId: saved.id,
              name: p.name,
              type: p.type,
              status: p.status,
              details: p.details,
            })),
          });
        }

        if (table.logs?.length) {
          await tx.tableLog.createMany({
            data: table.logs.map((l) => ({
              tableId: saved.id,
              level: String(l.level),
              category: l.category,
              message: l.message,
              occurredAt: l.occurredAt ? new Date(l.occurredAt) : new Date(),
            })),
          });
        }
      }

      await tx.diagnosticFinding.deleteMany({
        where: { clientId: opts.clientId, resolved: false },
      });
      if (parsed.findings.length) {
        await tx.diagnosticFinding.createMany({
          data: parsed.findings.map((f) => ({
            clientId: opts.clientId,
            severity: f.severity,
            category: f.category,
            title: f.title,
            description: f.description,
            recommendation: f.recommendation,
            tableCode: f.tableCode,
          })),
        });
      }

      const allTables = await tx.hardwareTable.findMany({ where: { clientId: opts.clientId } });
      const healthy = allTables.filter((t) => t.status === "HEALTHY").length;
      const warning = allTables.filter((t) => t.status === "WARNING").length;
      const critical = allTables.filter((t) => t.status === "CRITICAL").length;
      const offline = allTables.filter((t) => t.status === "OFFLINE").length;
      const score =
        allTables.length === 0
          ? 100
          : Math.round((healthy * 100 + warning * 70 + critical * 30 + offline * 10) / allTables.length);

      await tx.client.update({
        where: { id: opts.clientId },
        data: {
          tableCount: allTables.length,
          criticalIssues: critical,
          warningIssues: warning,
          healthScore: score,
          healthStatus:
            score >= 90 ? "HEALTHY" : score >= 70 ? "WARNING" : score >= 40 ? "CRITICAL" : "OFFLINE",
          availabilityPct: Math.round(((healthy + warning * 0.85) / Math.max(allTables.length, 1)) * 1000) / 10,
          lastUploadAt: new Date(),
          environment: parsed.payload.environment ?? undefined,
        },
      });

      await tx.healthSnapshot.create({
        data: {
          clientId: opts.clientId,
          healthScore: score,
          healthy,
          warning,
          critical,
          offline,
        },
      });

      await tx.collectorUpload.update({
        where: { id: upload.id },
        data: {
          status: "SUCCESS",
          parsedTables: parsed.counts.total,
          processedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: opts.uploadedById,
          action: "COLLECTOR_UPLOAD",
          entityType: "CollectorUpload",
          entityId: upload.id,
          details: `Parsed ${parsed.counts.total} tables for client ${opts.clientId}`,
        },
      });
    });

    return prisma.collectorUpload.findUniqueOrThrow({
      where: { id: upload.id },
      include: { client: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest error";
    await prisma.collectorUpload.update({
      where: { id: upload.id },
      data: { status: "FAILED", errorMessage: message, processedAt: new Date() },
    });
    throw error;
  }
}
