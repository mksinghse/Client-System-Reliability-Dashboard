import { PrismaClient, HealthStatus } from "@prisma/client";

const prisma = new PrismaClient();

type SeedClient = {
  name: string;
  code: string;
  environment: string;
  tables: number;
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
};

type SeedCountry = {
  code: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  clients: SeedClient[];
};

const countries: SeedCountry[] = [
  {
    code: "US",
    name: "United States",
    region: "Americas",
    latitude: 39.8,
    longitude: -98.5,
    clients: [
      { name: "Vegas Grand Casino", code: "US-VGC", environment: "Production", tables: 320, healthy: 280, warning: 28, critical: 8, offline: 4 },
      { name: "Atlantic Pearl", code: "US-ATL", environment: "Production", tables: 210, healthy: 170, warning: 25, critical: 10, offline: 5 },
      { name: "Desert Sands Resort", code: "US-DSR", environment: "Staging", tables: 96, healthy: 90, warning: 4, critical: 1, offline: 1 },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    region: "Americas",
    latitude: 56.1,
    longitude: -106.3,
    clients: [
      { name: "Northern Lights Gaming", code: "CA-NLG", environment: "Production", tables: 148, healthy: 130, warning: 12, critical: 4, offline: 2 },
      { name: "Maple Crown Casino", code: "CA-MCC", environment: "Production", tables: 88, healthy: 70, warning: 10, critical: 6, offline: 2 },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    region: "EMEA",
    latitude: 55.4,
    longitude: -3.4,
    clients: [
      { name: "Crown & Spade", code: "GB-CAS", environment: "Production", tables: 176, healthy: 150, warning: 16, critical: 7, offline: 3 },
      { name: "Thames Table Club", code: "GB-TTC", environment: "Production", tables: 64, healthy: 58, warning: 4, critical: 1, offline: 1 },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    region: "EMEA",
    latitude: 51.2,
    longitude: 10.4,
    clients: [
      { name: "Rhein Roulette House", code: "DE-RRH", environment: "Production", tables: 120, healthy: 95, warning: 15, critical: 7, offline: 3 },
      { name: "Berlin Chip Works", code: "DE-BCW", environment: "UAT", tables: 42, healthy: 38, warning: 3, critical: 1, offline: 0 },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    region: "APAC",
    latitude: -25.3,
    longitude: 133.8,
    clients: [
      { name: "Sydney Harbor Tables", code: "AU-SHT", environment: "Production", tables: 240, healthy: 210, warning: 18, critical: 8, offline: 4 },
      { name: "Melbourne Circuit", code: "AU-MLC", environment: "Production", tables: 132, healthy: 100, warning: 20, critical: 8, offline: 4 },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    region: "APAC",
    latitude: 1.35,
    longitude: 103.8,
    clients: [
      { name: "Marina Table Systems", code: "SG-MTS", environment: "Production", tables: 188, healthy: 175, warning: 8, critical: 3, offline: 2 },
      { name: "Orchard Gaming Hub", code: "SG-OGH", environment: "Production", tables: 74, healthy: 60, warning: 8, critical: 4, offline: 2 },
    ],
  },
  {
    code: "JP",
    name: "Japan",
    region: "APAC",
    latitude: 36.2,
    longitude: 138.3,
    clients: [
      { name: "Osaka Integrated Resort", code: "JP-OIR", environment: "Production", tables: 260, healthy: 220, warning: 25, critical: 10, offline: 5 },
      { name: "Tokyo Bay Tables", code: "JP-TBT", environment: "Production", tables: 110, healthy: 92, warning: 10, critical: 5, offline: 3 },
    ],
  },
  {
    code: "PH",
    name: "Philippines",
    region: "APAC",
    latitude: 12.9,
    longitude: 121.8,
    clients: [
      { name: "Manila Bay Entertainment", code: "PH-MBE", environment: "Production", tables: 300, healthy: 240, warning: 35, critical: 18, offline: 7 },
      { name: "Cebu Grand Tables", code: "PH-CGT", environment: "Production", tables: 95, healthy: 70, warning: 15, critical: 7, offline: 3 },
    ],
  },
];

function score(h: number, w: number, c: number, o: number) {
  const t = h + w + c + o;
  if (!t) return 100;
  return Math.round((h * 100 + w * 70 + c * 30 + o * 10) / t);
}

function statusFrom(scoreValue: number): HealthStatus {
  if (scoreValue >= 90) return "HEALTHY";
  if (scoreValue >= 70) return "WARNING";
  if (scoreValue >= 40) return "CRITICAL";
  return "OFFLINE";
}

async function main() {
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

  for (const country of countries) {
    const createdCountry = await prisma.country.create({
      data: {
        code: country.code,
        name: country.name,
        region: country.region,
        latitude: country.latitude,
        longitude: country.longitude,
      },
    });

    for (const client of country.clients) {
      const healthScore = score(client.healthy, client.warning, client.critical, client.offline);
      const healthStatus = statusFrom(healthScore);
      const lastUploadAt = new Date(Date.now() - Math.floor(Math.random() * 72) * 3600_000);
      const availabilityPct = Math.max(
        70,
        Math.round(((client.healthy + client.warning * 0.85) / client.tables) * 1000) / 10,
      );

      const createdClient = await prisma.client.create({
        data: {
          name: client.name,
          code: client.code,
          countryId: createdCountry.id,
          environment: client.environment,
          healthScore,
          healthStatus,
          tableCount: client.tables,
          criticalIssues: client.critical,
          warningIssues: client.warning,
          availabilityPct,
          lastUploadAt,
        },
      });

      const statusBudget: Array<{ status: HealthStatus; count: number }> = [
        { status: "HEALTHY", count: Math.min(12, client.healthy) },
        { status: "WARNING", count: Math.min(6, client.warning) },
        { status: "CRITICAL", count: Math.min(4, client.critical) },
        { status: "OFFLINE", count: Math.min(2, client.offline) },
      ];
      const sampleStatuses = statusBudget.flatMap(({ status, count }) =>
        Array.from({ length: count }, () => status),
      );

      // Persist a representative subset of tables for detail views
      for (let i = 0; i < sampleStatuses.length; i++) {
        const status = sampleStatuses[i];
        const table = await prisma.hardwareTable.create({
          data: {
            clientId: createdClient.id,
            tableName: `Table ${String(i + 1).padStart(3, "0")}`,
            tableCode: `${client.code}-T${String(i + 1).padStart(3, "0")}`,
            status,
            firmwareVer: `FW-4.${(i % 5) + 1}.${i % 9}`,
            appVersion: `PP-${22 + (i % 3)}.${i % 10}.0`,
            osInfo: i % 2 === 0 ? "Ubuntu 22.04 LTS" : "Windows Server 2019",
            cpuUsage: status === "CRITICAL" ? 88 + (i % 10) : 25 + (i % 40),
            memoryUsage: status === "WARNING" ? 78 + (i % 12) : 40 + (i % 30),
            storageUsage: 35 + (i % 45),
            networkInfo: `eth0 1Gbps · latency ${4 + (i % 20)}ms`,
            serviceStatus: status === "OFFLINE" ? "Stopped" : "Running",
            lastSeenAt: status === "OFFLINE" ? new Date(Date.now() - 86400_000) : lastUploadAt,
            peripherals: {
              create: [
                { name: "Chip Tray Sensor", type: "Sensor", status: status === "CRITICAL" ? "Fault" : "OK" },
                { name: "Dealer Display", type: "Display", status: status === "OFFLINE" ? "Offline" : "OK" },
                { name: "RFID Antenna", type: "RFID", status: status === "WARNING" ? "Degraded" : "OK" },
              ],
            },
            logs: {
              create:
                status === "HEALTHY"
                  ? []
                  : [
                      {
                        level: status === "CRITICAL" || status === "OFFLINE" ? "ERROR" : "WARN",
                        category: status === "OFFLINE" ? "Connectivity" : "Hardware",
                        message:
                          status === "OFFLINE"
                            ? "Table heartbeat missed for > 30 minutes"
                            : "Peripheral telemetry exceeded warning threshold",
                      },
                    ],
            },
          },
        });

        if (status !== "HEALTHY") {
          await prisma.diagnosticFinding.create({
            data: {
              clientId: createdClient.id,
              severity: status,
              category: status === "OFFLINE" ? "Connectivity" : "Hardware",
              title: `${table.tableName} requires attention`,
              description: `Detected ${status.toLowerCase()} condition on ${table.tableCode}.`,
              recommendation:
                status === "OFFLINE"
                  ? "Verify network path and restart table services."
                  : "Run Offline Table Diagnostic Collector and review peripheral health.",
              tableCode: table.tableCode,
            },
          });
        }
      }

      // Historical snapshots (14 days)
      for (let d = 13; d >= 0; d--) {
        const drift = Math.sin(d / 3) * 4;
        const snapScore = Math.max(35, Math.min(100, healthScore + drift));
        await prisma.healthSnapshot.create({
          data: {
            clientId: createdClient.id,
            healthScore: Math.round(snapScore),
            healthy: client.healthy,
            warning: client.warning,
            critical: client.critical,
            offline: client.offline,
            capturedAt: new Date(Date.now() - d * 86400_000),
          },
        });
        await prisma.clientMetric.createMany({
          data: [
            {
              clientId: createdClient.id,
              metricKey: "cpu_avg",
              value: 30 + ((d + client.critical) % 40),
              unit: "%",
              capturedAt: new Date(Date.now() - d * 86400_000),
            },
            {
              clientId: createdClient.id,
              metricKey: "incident_count",
              value: Math.max(0, client.critical + (d % 3) - 1),
              unit: "count",
              capturedAt: new Date(Date.now() - d * 86400_000),
            },
          ],
        });
      }

      await prisma.collectorUpload.create({
        data: {
          clientId: createdClient.id,
          uploadedById: admin.id,
          fileName: `${client.code.toLowerCase()}_collector_${lastUploadAt.toISOString().slice(0, 10)}.json`,
          fileSize: 120_000 + client.tables * 250,
          status: "SUCCESS",
          parsedTables: sampleStatuses.length,
          processedAt: lastUploadAt,
          createdAt: lastUploadAt,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_DATABASE",
      entityType: "System",
      details: "Initial seed populated with multi-country hardware inventory",
    },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
