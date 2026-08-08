import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { relativeTime } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      country: true,
      tables: {
        include: { peripherals: true, logs: { orderBy: { occurredAt: "desc" }, take: 5 } },
        orderBy: [{ status: "desc" }, { tableName: "asc" }],
      },
      diagnostics: { where: { resolved: false }, orderBy: { createdAt: "desc" } },
      healthSnapshots: { orderBy: { capturedAt: "asc" }, take: 14 },
      uploads: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!client) notFound();

  return (
    <div>
      <div className="row">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            <Link href={`/countries/${client.country.code}`}>{client.country.name}</Link> / {client.code}
          </p>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-sub">Collector-backed inventory, firmware, metrics, logs, and recommendations.</p>
        </div>
        <div className="row">
          <HealthBadge status={client.healthStatus} />
          <Link className="btn btn-secondary" href={`/compare?ids=${client.id}`}>
            Compare
          </Link>
          <Link className="btn btn-teal" href={`/admin/uploads?clientId=${client.id}`}>
            Upload collector
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Health Score" value={client.healthScore} />
        <KpiCard label="Environment" value={client.environment} />
        <KpiCard label="Tables" value={client.tableCount} />
        <KpiCard label="Last Collector Upload" value={relativeTime(client.lastUploadAt)} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Hardware Inventory Summary</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Status</th>
                  <th>Firmware</th>
                  <th>App</th>
                  <th>CPU</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {client.tables.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.tableName}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{t.tableCode}</div>
                    </td>
                    <td><HealthBadge status={t.status} /></td>
                    <td>{t.firmwareVer ?? "—"}</td>
                    <td>{t.appVersion ?? "—"}</td>
                    <td>{t.cpuUsage ?? "—"}%</td>
                    <td>{t.memoryUsage ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Health Trend</h2>
            <TrendChart
              data={client.healthSnapshots.map((s) => ({
                date: s.capturedAt.toISOString().slice(0, 10),
                score: s.healthScore,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Diagnostic Findings</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {client.diagnostics.length ? (
                client.diagnostics.map((d) => (
                  <div key={d.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0.8rem" }}>
                    <div className="row">
                      <strong>{d.title}</strong>
                      <HealthBadge status={d.severity} />
                    </div>
                    <p className="muted" style={{ margin: "0.4rem 0", fontSize: "0.88rem" }}>{d.description}</p>
                    {d.recommendation ? (
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>
                        <strong>Recommendation:</strong> {d.recommendation}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="muted">No open findings.</p>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Collector-Based Details</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {client.tables.slice(0, 6).map((t) => (
                <details key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0.75rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t.tableName} · {t.tableCode}</summary>
                  <div className="stack-sm" style={{ marginTop: 10, fontSize: "0.88rem" }}>
                    <div>OS: {t.osInfo ?? "—"}</div>
                    <div>Network: {t.networkInfo ?? "—"}</div>
                    <div>Service: {t.serviceStatus ?? "—"}</div>
                    <div>Storage: {t.storageUsage ?? "—"}%</div>
                    <div>
                      Peripherals:{" "}
                      {t.peripherals.map((p) => `${p.name} (${p.status})`).join(", ") || "—"}
                    </div>
                    <div>
                      Logs:{" "}
                      {t.logs.length
                        ? t.logs.map((l) => `[${l.level}] ${l.message}`).join(" · ")
                        : "None"}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Upload History</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Tables Parsed</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {client.uploads.map((u) => (
                <tr key={u.id}>
                  <td>{u.fileName}</td>
                  <td>{u.status}</td>
                  <td>{u.parsedTables}</td>
                  <td>{relativeTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
