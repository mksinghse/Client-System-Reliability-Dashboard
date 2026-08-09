import Link from "next/link";
import { getExecutiveOverview } from "@/lib/analytics";
import { KpiCard } from "@/components/KpiCard";
import { HealthPie } from "@/components/charts/HealthPie";
import { TrendChart } from "@/components/charts/TrendChart";
import { CountryMap } from "@/components/CountryMap";
import { relativeTime } from "@/lib/utils";

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveOverview();

  return (
    <div>
      <div className="row">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-sub">
            Fleet posture from device-info client comparison. Only countries with data are listed; upload collector JSON with a new country/client to add regions automatically.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Countries" value={data.kpis.totalCountries} href="/countries" />
        <KpiCard label="Clients" value={data.kpis.totalClients} href="/clients" />
        <KpiCard label="Devices" value={data.kpis.totalTables} href="/devices" />
        <KpiCard
          label="Requiring Action"
          value={data.kpis.requiringAction}
          hint="Warning + Critical + Offline"
          href="/devices?status=FAILED"
        />
        <KpiCard label="Healthy" value={data.kpis.healthyTables} href="/devices?status=OK" />
        <KpiCard label="Warning" value={data.kpis.warningTables} href="/devices?status=WARNING" />
        <KpiCard label="Critical" value={data.kpis.criticalTables} href="/devices?status=FAILED" />
        <KpiCard label="Offline" value={data.kpis.offlineTables} href="/devices?status=OFFLINE" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <div className="row">
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Country Distribution Map</h2>
              <Link href="/countries" className="muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                View countries →
              </Link>
            </div>
            <div style={{ marginTop: 12 }}>
              <CountryMap points={data.mapPoints} />
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Health Status</h2>
            <HealthPie data={data.healthPie} />
            <div className="row" style={{ marginTop: 4 }}>
              {data.healthPie.map((item) => (
                <span key={item.key} className="muted" style={{ fontSize: "0.8rem" }}>
                  {item.name}: <strong style={{ color: "var(--ink)" }}>{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Trend Analysis</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.85rem" }}>
              14-day global average health score
            </p>
            <TrendChart data={data.trend} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Region-wise Hardware Statistics</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Clients</th>
                  <th>Tables</th>
                  <th>Critical</th>
                </tr>
              </thead>
              <tbody>
                {data.regionStats.map((r) => (
                  <tr key={r.region}>
                    <td>{r.region}</td>
                    <td>{r.clients}</td>
                    <td>{r.tables}</td>
                    <td>{r.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Issue Classification Breakdown</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Open Issues</th>
                </tr>
              </thead>
              <tbody>
                {data.issueBreakdown.length ? (
                  data.issueBreakdown.map((i) => (
                    <tr key={i.category}>
                      <td>{i.category}</td>
                      <td>{i.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="muted">
                      No open diagnostic findings
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Recent Collector Uploads</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUploads.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/clients/${u.clientId}`} style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
                        {u.client.name}
                      </Link>
                    </td>
                    <td>{u.client.country.name}</td>
                    <td>{u.status}</td>
                    <td>{relativeTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
