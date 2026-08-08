import { prisma } from "./db";
import type { HealthStatus } from "@prisma/client";

export async function getExecutiveOverview() {
  const [countries, clients, tables, uploads, findings] = await Promise.all([
    prisma.country.count(),
    prisma.client.findMany({ where: { archived: false }, include: { country: true } }),
    prisma.hardwareTable.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.collectorUpload.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { client: { include: { country: true } } },
    }),
    prisma.diagnosticFinding.groupBy({
      by: ["category"],
      where: { resolved: false },
      _count: { _all: true },
    }),
  ]);

  const statusMap: Record<HealthStatus, number> = {
    HEALTHY: 0,
    WARNING: 0,
    CRITICAL: 0,
    OFFLINE: 0,
  };
  for (const row of tables) statusMap[row.status] = row._count._all;

  const totalTables = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const requiringAction = statusMap.WARNING + statusMap.CRITICAL + statusMap.OFFLINE;

  const regionMap = new Map<string, { region: string; tables: number; clients: number; critical: number }>();
  for (const client of clients) {
    const current = regionMap.get(client.country.region) ?? {
      region: client.country.region,
      tables: 0,
      clients: 0,
      critical: 0,
    };
    current.tables += client.tableCount;
    current.clients += 1;
    current.critical += client.criticalIssues;
    regionMap.set(client.country.region, current);
  }

  const countryStats = await prisma.country.findMany({
    include: {
      clients: {
        where: { archived: false },
        select: {
          tableCount: true,
          criticalIssues: true,
          healthScore: true,
          healthStatus: true,
        },
      },
    },
  });

  const mapPoints = countryStats.map((c) => ({
    code: c.code,
    name: c.name,
    region: c.region,
    latitude: c.latitude ?? 0,
    longitude: c.longitude ?? 0,
    clients: c.clients.length,
    tables: c.clients.reduce((sum, x) => sum + x.tableCount, 0),
    avgHealth: c.clients.length
      ? Math.round(c.clients.reduce((sum, x) => sum + x.healthScore, 0) / c.clients.length)
      : 100,
    critical: c.clients.reduce((sum, x) => sum + x.criticalIssues, 0),
  }));

  const snapshots = await prisma.healthSnapshot.findMany({
    where: { capturedAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
    orderBy: { capturedAt: "asc" },
  });
  const trendBuckets = new Map<string, { date: string; score: number; n: number }>();
  for (const snap of snapshots) {
    const date = snap.capturedAt.toISOString().slice(0, 10);
    const bucket = trendBuckets.get(date) ?? { date, score: 0, n: 0 };
    bucket.score += snap.healthScore;
    bucket.n += 1;
    trendBuckets.set(date, bucket);
  }

  return {
    kpis: {
      totalCountries: countries,
      totalClients: clients.length,
      totalTables,
      healthyTables: statusMap.HEALTHY,
      warningTables: statusMap.WARNING,
      criticalTables: statusMap.CRITICAL,
      offlineTables: statusMap.OFFLINE,
      requiringAction,
    },
    healthPie: [
      { name: "Healthy", value: statusMap.HEALTHY, key: "HEALTHY" },
      { name: "Warning", value: statusMap.WARNING, key: "WARNING" },
      { name: "Critical", value: statusMap.CRITICAL, key: "CRITICAL" },
      { name: "Offline", value: statusMap.OFFLINE, key: "OFFLINE" },
    ],
    regionStats: Array.from(regionMap.values()),
    mapPoints,
    recentUploads: uploads,
    issueBreakdown: findings.map((f) => ({ category: f.category, count: f._count._all })),
    trend: Array.from(trendBuckets.values()).map((b) => ({
      date: b.date,
      score: Math.round(b.score / b.n),
    })),
  };
}

export async function compareClients(clientIds: string[]) {
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    include: {
      country: true,
      healthSnapshots: { orderBy: { capturedAt: "asc" }, take: 14 },
      metrics: {
        where: { metricKey: { in: ["cpu_avg", "incident_count"] } },
        orderBy: { capturedAt: "desc" },
        take: 30,
      },
      diagnostics: { where: { resolved: false } },
    },
  });

  const rows = clients.map((c) => {
    const cpu = c.metrics.filter((m) => m.metricKey === "cpu_avg");
    const cpuAvg = cpu.length ? cpu.reduce((s, m) => s + m.value, 0) / cpu.length : 0;
    return {
      id: c.id,
      name: c.name,
      country: c.country.name,
      healthScore: c.healthScore,
      tableCount: c.tableCount,
      criticalIssues: c.criticalIssues,
      warningIssues: c.warningIssues,
      availabilityPct: c.availabilityPct,
      cpuUtilization: Math.round(cpuAvg),
      openFindings: c.diagnostics.length,
      trend: c.healthSnapshots.map((s) => ({ date: s.capturedAt.toISOString().slice(0, 10), score: s.healthScore })),
    };
  });

  const best = [...rows].sort((a, b) => b.healthScore - a.healthScore)[0] ?? null;
  const mostStable = [...rows].sort((a, b) => b.availabilityPct - a.availabilityPct)[0] ?? null;
  const highestRisk = [...rows].sort((a, b) => b.criticalIssues - a.criticalIssues)[0] ?? null;
  const mostIssues = [...rows].sort((a, b) => b.openFindings - a.openFindings)[0] ?? null;

  return {
    clients: rows,
    benchmarks: {
      bestPerforming: best,
      mostStable,
      highestRisk,
      mostFrequentIssues: mostIssues,
    },
  };
}
