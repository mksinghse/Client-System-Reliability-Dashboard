import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "@/lib/ddb/store";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ClientItxDashboardView } from "@/components/ClientItxDashboard";
import { ClientFleetProfile } from "@/components/ClientFleetProfile";
import { getClientItxDashboard, getDeviceInfoForClientCode } from "@/lib/client-itx";
import { relativeTime } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await store.getClientById(id);
  if (!client) notFound();

  const [tables, diagnostics, healthSnapshots, uploads] = await Promise.all([
    store.listTables(id),
    store.listFindings(id, true),
    store.listSnapshots({ clientId: id, take: 14 }),
    store.listUploads({ clientId: id, take: 5 }),
  ]);

  const itx = getClientItxDashboard(client.code);
  const deviceInfo = getDeviceInfoForClientCode(client.code);

  return (
    <div>
      <div className="row">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            <Link href={`/countries/${client.country.code}`}>{client.country.name}</Link> / {client.code}
          </p>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-sub">
            {itx
              ? "ITX host dashboard from Offline Table Diagnostic Collector SUPPORT logs (shared canvas layout)."
              : "Fleet profile from device-info client comparison. Upload collector JSON for ITX-style host detail."}
          </p>
        </div>
        <div className="row">
          <HealthBadge status={client.healthStatus} />
          <Link className="btn btn-secondary" href={`/compare?ids=${client.id}`}>
            Compare
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Health Score" value={client.healthScore} />
        <KpiCard label="Environment" value={client.environment} />
        <KpiCard label="Devices" value={client.tableCount} href={`/devices?client=${encodeURIComponent(client.code)}`} />
        <KpiCard label="Last scan / upload" value={relativeTime(client.lastUploadAt)} />
      </div>

      {itx ? <ClientItxDashboardView data={itx} /> : null}
      {!itx && deviceInfo ? <ClientFleetProfile info={deviceInfo} clientCode={client.code} /> : null}

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Diagnostic Findings</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {diagnostics.length ? (
                diagnostics.map((d) => (
                  <div key={d.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0.8rem" }}>
                    <div className="row">
                      <strong>{d.title}</strong>
                      <HealthBadge status={d.severity} />
                    </div>
                    <p className="muted" style={{ margin: "0.4rem 0", fontSize: "0.88rem" }}>
                      {d.description}
                    </p>
                    {d.recommendation ? (
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>{d.recommendation}</p>
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
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Health trend</h2>
            <TrendChart
              data={healthSnapshots.map((s) => ({
                date: s.capturedAt.slice(0, 10),
                score: s.healthScore,
              }))}
            />
          </div>
        </div>
      </div>

      {tables.length ? (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Hardware tables</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Status</th>
                  <th>OS</th>
                  <th>CPU</th>
                  <th>Mem</th>
                  <th>Disk</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.tableName}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>
                        {t.tableCode}
                      </div>
                    </td>
                    <td>
                      <HealthBadge status={t.status} />
                    </td>
                    <td>{t.osInfo ?? "—"}</td>
                    <td>{t.cpuUsage ?? "—"}</td>
                    <td>{t.memoryUsage ?? "—"}</td>
                    <td>{t.storageUsage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Recent uploads</h2>
          {uploads.length ? (
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Parsed</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fileName}</td>
                    <td>{u.status}</td>
                    <td>{u.parsedTables}</td>
                    <td>{relativeTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>
              No collector uploads yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
