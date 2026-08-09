import Link from "next/link";
import { store } from "@/lib/ddb/store";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiCard } from "@/components/KpiCard";
import { loadDevicesInventory } from "@/lib/devices-inventory";

export default async function ClientsPage() {
  const clients = await store.listClients({ archived: false });
  clients.sort(
    (a, b) =>
      a.country.name.localeCompare(b.country.name) || a.name.localeCompare(b.name),
  );
  const inv = loadDevicesInventory();

  return (
    <div>
      <h1 className="page-title">Clients</h1>
      <p className="page-sub">Macau fleet clients with device-info posture. Open a client for ITX/host detail.</p>

      <div className="kpi-grid">
        <KpiCard label="Clients" value={clients.length} href="/clients" />
        <KpiCard label="Inventory devices" value={inv.count} href="/devices" />
        <KpiCard label="Countries with clients" value={new Set(clients.map((c) => c.countryId)).size} href="/countries" />
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Country</th>
                <th>Devices</th>
                <th>FAILED</th>
                <th>OK %</th>
                <th>Health</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const failed = c.criticalIssues;
                const okPct =
                  c.tableCount > 0
                    ? Math.round(((c.tableCount - failed) / c.tableCount) * 1000) / 10
                    : 100;
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {c.code}
                      </div>
                    </td>
                    <td>{c.country.name}</td>
                    <td>{c.tableCount}</td>
                    <td>{failed}</td>
                    <td>{okPct}%</td>
                    <td>
                      <HealthBadge status={c.healthStatus} />
                    </td>
                    <td>
                      <Link className="btn btn-secondary" href={`/clients/${c.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
