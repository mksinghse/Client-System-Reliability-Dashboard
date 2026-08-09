import { readFileSync } from "node:fs";
import { join } from "node:path";
import { store } from "../src/lib/ddb/store";

type ComparisonClient = {
  client: string;
  total: number;
  ok: number;
  failed: number;
  okPct: number;
  heapNow: string;
  tempAvg: number;
  hot70: number;
};

type ComparisonFile = { clients: ComparisonClient[] };

const CLIENT_META: Record<string, { name: string; code: string }> = {
  GM: { name: "Galaxy Macau (GM)", code: "GM" },
  Melco: { name: "Melco", code: "MELCO" },
  SJM: { name: "SJM", code: "SJM" },
  SW: { name: "SW", code: "SW" },
  Wynn: { name: "Wynn", code: "WYNN" },
  MGM: { name: "MGM", code: "MGM" },
};

function parseHeapMb(heapNow: string): number {
  const m = heapNow.match(/(\d+)\s*M/i);
  return m ? Number(m[1]) : 0;
}

async function main() {
  if (!process.env.DYNAMODB_TABLE_NAME) {
    throw new Error("Set DYNAMODB_TABLE_NAME before seeding");
  }

  await store.putUser({ email: "admin@wdts.com", name: "WDTS Admin", role: "ADMIN" });
  await store.putUser({ email: "ops@wdts.com", name: "Ops Viewer", role: "OPERATOR" });

  const country = await store.upsertCountry({
    code: "MO",
    name: "Macau",
    region: "APAC",
    latitude: 22.2,
    longitude: 113.5,
  });

  const comparison = JSON.parse(
    readFileSync(join(process.cwd(), "data/device-info-client-comparison.json"), "utf8"),
  ) as ComparisonFile;

  for (const row of comparison.clients) {
    const meta = CLIENT_META[row.client];
    if (!meta) continue;
    const healthStatus =
      row.okPct >= 99 ? "HEALTHY" : row.okPct >= 95 ? "WARNING" : row.okPct >= 90 ? "CRITICAL" : "OFFLINE";
    const client = await store.upsertClient({
      code: meta.code,
      name: meta.name,
      countryId: country.id,
      environment: "Production",
    });
    await store.updateClient(client.id, {
      tableCount: row.total,
      criticalIssues: row.failed,
      warningIssues: 0,
      healthScore: row.okPct,
      healthStatus,
      availabilityPct: row.okPct,
    });
    await store.putMetric({
      clientId: client.id,
      metricKey: "ok_pct",
      value: row.okPct,
    });
    await store.putMetric({
      clientId: client.id,
      metricKey: "heap_now_mb",
      value: parseHeapMb(row.heapNow),
    });
    await store.putMetric({
      clientId: client.id,
      metricKey: "temp_avg",
      value: row.tempAvg,
    });
    await store.putMetric({
      clientId: client.id,
      metricKey: "hot70",
      value: row.hot70,
    });
  }

  console.log("DynamoDB seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
