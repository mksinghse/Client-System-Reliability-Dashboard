import { store } from "./ddb/store";
import type { HealthStatus } from "./models";
import { loadDevicesInventory } from "./devices-inventory";

export async function getExecutiveOverview() {
  const [clients, statusMapRaw, uploads, findings] = await Promise.all([
    store.listClients({ archived: false }),
    store.groupTableStatus(),
    store.listUploads({ take: 8 }),
    store.groupFindingsByCategory(),
  ]);

  const countriesWithClients = new Set(clients.map((c) => c.countryId)).size;
  const statusMap: Record<HealthStatus, number> = { ...statusMapRaw };

  const hardwareTotal = Object.values(statusMap).reduce((a, b) => a + b, 0);
  if (hardwareTotal === 0) {
    for (const client of clients) {
      const healthy = Math.max(0, client.tableCount - client.criticalIssues - client.warningIssues);
      statusMap.HEALTHY += healthy;
      statusMap.WARNING += client.warningIssues;
      statusMap.CRITICAL += client.criticalIssues;
    }
  }

  const inventory = loadDevicesInventory();
  const totalTables =
    hardwareTotal > 0
      ? hardwareTotal
      : inventory.count || clients.reduce((sum, c) => sum + c.tableCount, 0);

  if (hardwareTotal === 0 && inventory.count) {
    const ok = inventory.devices.filter((d) => d.status === "OK").length;
    const failed = inventory.devices.filter((d) => d.status === "FAILED").length;
    statusMap.HEALTHY = ok;
    statusMap.WARNING = 0;
    statusMap.CRITICAL = failed;
    statusMap.OFFLINE = Math.max(0, inventory.count - ok - failed);
  }

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

  const byCountry = new Map<string, typeof clients>();
  for (const c of clients) {
    const list = byCountry.get(c.countryId) ?? [];
    list.push(c);
    byCountry.set(c.countryId, list);
  }

  const mapPoints = Array.from(byCountry.entries()).map(([, list]) => {
    const country = list[0].country;
    return {
      code: country.code,
      name: country.name,
      region: country.region,
      latitude: country.latitude ?? 0,
      longitude: country.longitude ?? 0,
      clients: list.length,
      tables: list.reduce((sum, x) => sum + x.tableCount, 0),
      avgHealth: list.length
        ? Math.round(list.reduce((sum, x) => sum + x.healthScore, 0) / list.length)
        : 100,
      critical: list.reduce((sum, x) => sum + x.criticalIssues, 0),
    };
  });

  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const snapshots = await store.listSnapshots({ since, take: 500 });
  const trendBuckets = new Map<string, { date: string; score: number; n: number }>();
  for (const snap of snapshots) {
    const date = snap.capturedAt.slice(0, 10);
    const bucket = trendBuckets.get(date) ?? { date, score: 0, n: 0 };
    bucket.score += snap.healthScore;
    bucket.n += 1;
    trendBuckets.set(date, bucket);
  }

  return {
    kpis: {
      totalCountries: countriesWithClients,
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
    recentUploads: uploads.map((u) => ({
      ...u,
      client: u.client
        ? { ...u.client, country: u.client.country }
        : undefined,
    })),
    issueBreakdown: findings,
    trend: Array.from(trendBuckets.values()).map((b) => ({
      date: b.date,
      score: Math.round(b.score / b.n),
    })),
  };
}

export async function compareClients(clientIds: string[]) {
  const rows = [];
  for (const id of clientIds) {
    const c = await store.getClientById(id);
    if (!c) continue;
    const [healthSnapshots, metrics, diagnostics] = await Promise.all([
      store.listSnapshots({ clientId: id, take: 14 }),
      store.listMetrics(id, ["cpu_avg", "incident_count", "temp_avg", "heap_now_mb", "ok_pct", "hot70"], 60),
      store.listFindings(id, true),
    ]);
    const latest = (key: string) => metrics.find((m) => m.metricKey === key)?.value;
    const cpu = metrics.filter((m) => m.metricKey === "cpu_avg");
    const cpuAvg = cpu.length ? cpu.reduce((s, m) => s + m.value, 0) / cpu.length : 0;
    const heapMb = latest("heap_now_mb") ?? 0;
    const tempAvg = latest("temp_avg") ?? 0;
    rows.push({
      id: c.id,
      name: c.name,
      country: c.country.name,
      healthScore: c.healthScore,
      tableCount: c.tableCount,
      criticalIssues: c.criticalIssues,
      warningIssues: c.warningIssues,
      availabilityPct: c.availabilityPct,
      cpuUtilization: Math.round(cpuAvg || tempAvg),
      heapMb: Math.round(heapMb),
      tempAvg: Math.round(tempAvg * 10) / 10,
      openFindings: diagnostics.length,
      trend: healthSnapshots.map((s) => ({ date: s.capturedAt.slice(0, 10), score: s.healthScore })),
    });
  }

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
