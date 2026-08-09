import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, HealthStatus } from "@prisma/client";

const prisma = new PrismaClient();

const COLLECTOR_DOCS_URL =
  "https://wdtablesystems.atlassian.net/wiki/spaces/SEKB/pages/5713002543/WDTS+Offline+Table+Diagnostic+Collector+Run+from+SharePoint";

type ComparisonClient = {
  client: string;
  total: number;
  ok: number;
  failed: number;
  okPct: number;
  ram: string;
  ramUniform: boolean;
  type: string;
  brands: string;
  heapNow: string;
  heapDist?: Record<string, number>;
  fleetMax: string;
  osPrimary: string;
  tempAvg: number;
  tempMax: number;
  hot70: number;
  collected: string;
};

type ComparisonFile = {
  clients: ComparisonClient[];
};

/** Seed only countries that currently have fleet data. Others appear when created on upload. */
const COUNTRIES = [
  { code: "MO", name: "Macau", region: "APAC", latitude: 22.2, longitude: 113.5 },
] as const;

/** All current comparison clients are Macau properties. */
const CLIENT_META: Record<
  string,
  { name: string; code: string; countryCode: (typeof COUNTRIES)[number]["code"]; environment: string }
> = {
  GM: { name: "Galaxy Macau (GM)", code: "GM", countryCode: "MO", environment: "Production" },
  Melco: { name: "Melco", code: "MELCO", countryCode: "MO", environment: "Production" },
  SJM: { name: "SJM", code: "SJM", countryCode: "MO", environment: "Production" },
  SW: { name: "SW", code: "SW", countryCode: "MO", environment: "Production" },
  Wynn: { name: "Wynn", code: "WYNN", countryCode: "MO", environment: "Production" },
  MGM: { name: "MGM", code: "MGM", countryCode: "MO", environment: "Production" },
};

function statusFromOkPct(okPct: number): HealthStatus {
  if (okPct >= 99) return "HEALTHY";
  if (okPct >= 95) return "WARNING";
  if (okPct >= 90) return "CRITICAL";
  return "OFFLINE";
}

function parseHeapMb(heapNow: string): number {
  const m = heapNow.match(/(\d+)\s*M/i);
  return m ? Number(m[1]) : 0;
}

function loadComparison(): ComparisonFile {
  const path = join(process.cwd(), "data", "device-info-client-comparison.json");
  return JSON.parse(readFileSync(path, "utf8")) as ComparisonFile;
}

async function main() {
  const comparison = loadComparison();

  await prisma.auditLog.deleteMany();
  await prisma.clientMetric.deleteMany();
  await prisma.healthSnapshot.deleteMany();
  await prisma.diagnosticFinding.deleteMany();
  await prisma.tableLog.deleteMany();
  await prisma.peripheral.deleteMany();
  await prisma.hardwareTable.deleteMany();
  await prisma.collectorUpload.deleteMany();
  await prisma.client.deleteMany();
  await prisma.country.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@wdts.com",
      name: "WDTS Admin",
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      email: "ops@wdts.com",
      name: "Ops Viewer",
      role: "OPERATOR",
    },
  });

  const countryIds = new Map<string, string>();
  for (const country of COUNTRIES) {
    const created = await prisma.country.create({
      data: {
        code: country.code,
        name: country.name,
        region: country.region,
        latitude: country.latitude,
        longitude: country.longitude,
      },
    });
    countryIds.set(country.code, created.id);
  }

  for (const row of comparison.clients) {
    const meta = CLIENT_META[row.client];
    if (!meta) {
      console.warn(`Skipping unknown comparison client: ${row.client}`);
      continue;
    }
    const countryId = countryIds.get(meta.countryCode);
    if (!countryId) throw new Error(`Missing country ${meta.countryCode}`);

    const healthScore = Math.round(row.okPct * 10) / 10;
    const healthStatus = statusFromOkPct(row.okPct);
    const collectedAt = new Date(`${row.collected}T12:00:00.000Z`);
    const heapMb = parseHeapMb(row.heapNow);

    const createdClient = await prisma.client.create({
      data: {
        name: meta.name,
        code: meta.code,
        countryId,
        environment: meta.environment,
        healthScore,
        healthStatus,
        tableCount: row.total,
        criticalIssues: row.failed,
        warningIssues: row.hot70,
        availabilityPct: row.okPct,
        lastUploadAt: collectedAt,
      },
    });

    await prisma.healthSnapshot.create({
      data: {
        clientId: createdClient.id,
        healthScore,
        healthy: row.ok,
        warning: row.hot70,
        critical: row.failed,
        offline: 0,
        capturedAt: collectedAt,
      },
    });

    await prisma.clientMetric.createMany({
      data: [
        {
          clientId: createdClient.id,
          metricKey: "devices_ok",
          value: row.ok,
          unit: "count",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "devices_failed",
          value: row.failed,
          unit: "count",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "ok_pct",
          value: row.okPct,
          unit: "%",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "temp_avg",
          value: row.tempAvg,
          unit: "C",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "temp_max",
          value: row.tempMax,
          unit: "C",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "hot70",
          value: row.hot70,
          unit: "count",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "heap_now_mb",
          value: heapMb,
          unit: "MB",
          capturedAt: collectedAt,
        },
        {
          clientId: createdClient.id,
          metricKey: "incident_count",
          value: row.failed,
          unit: "count",
          capturedAt: collectedAt,
        },
      ],
    });

    const findings: Array<{
      severity: HealthStatus;
      category: string;
      title: string;
      description: string;
      recommendation: string;
    }> = [];

    if (row.client === "SJM" && heapMb >= 10240) {
      findings.push({
        severity: "WARNING",
        category: "JVM / Memory",
        title: "Fleet heap 10240M on uniform 16GB RAM",
        description:
          "Device-info client comparison and Offline Table Diagnostic Collector findings: SJM runs -Xms/-Xmx 10240M on ~16GB single-DIMM hosts, leaving little OS/Chrome headroom (RSS near Xmx).",
        recommendation: `${COLLECTOR_DOCS_URL} — pull SUPPORT.log (free -m, commit/heap, NVMe SMART) before DIMM swap.`,
      });
    }

    if (!row.ramUniform) {
      findings.push({
        severity: "CRITICAL",
        category: "Hardware",
        title: "Non-uniform RAM profile across fleet",
        description: `RAM mix: ${row.ram} · types ${row.type} · brands ${row.brands}`,
        recommendation: "Normalize memory SKUs and re-scan with Offline Table Diagnostic Collector.",
      });
    }

    if (row.hot70 > 0) {
      findings.push({
        severity: row.hot70 >= 10 ? "CRITICAL" : "WARNING",
        category: "Thermal",
        title: `${row.hot70} device(s) at/above 70°C`,
        description: `Fleet temp avg ${row.tempAvg}°C, max ${row.tempMax}°C (scan ${row.collected}).`,
        recommendation: "Inspect cooling path; capture NVMe SMART + free -m via collector SUPPORT.log.",
      });
    }

    if (row.failed > 0) {
      findings.push({
        severity: row.okPct < 95 ? "CRITICAL" : "WARNING",
        category: "Device scan",
        title: `${row.failed} FAILED device(s) in latest scan`,
        description: `${row.ok}/${row.total} OK (${row.okPct}%). Source: device-info client comparison ${row.collected}.`,
        recommendation: "Re-run Offline Table Diagnostic Collector on failed hosts and upload SUPPORT.log / JSON.",
      });
    }

    if (findings.length) {
      await prisma.diagnosticFinding.createMany({
        data: findings.map((f) => ({
          clientId: createdClient.id,
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
        })),
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_DATABASE",
      entityType: "System",
      details: `Countries only + clients from device-info comparison (${comparison.clients.length}). Collector docs: ${COLLECTOR_DOCS_URL}`,
    },
  });

  console.log(
    `Seed complete: ${COUNTRIES.length} countries, ${comparison.clients.length} clients from device-info comparison (no dummy tables).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
