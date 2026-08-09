import Link from "next/link";
import { store } from "@/lib/ddb/store";
import { KpiCard } from "@/components/KpiCard";

export default async function CountriesPage() {
  const clients = await store.listClients({ archived: false });
  const byCountry = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      region: string;
      clients: Array<{ id: string; tableCount: number; criticalIssues: number; healthScore: number }>;
    }
  >();

  for (const c of clients) {
    const cur = byCountry.get(c.countryId) ?? {
      id: c.country.id,
      code: c.country.code,
      name: c.country.name,
      region: c.country.region,
      clients: [],
    };
    cur.clients.push({
      id: c.id,
      tableCount: c.tableCount,
      criticalIssues: c.criticalIssues,
      healthScore: c.healthScore,
    });
    byCountry.set(c.countryId, cur);
  }

  const countries = Array.from(byCountry.values()).sort((a, b) => a.name.localeCompare(b.name));
  const totalClients = countries.reduce((s, c) => s + c.clients.length, 0);
  const totalTables = countries.reduce(
    (s, c) => s + c.clients.reduce((a, x) => a + x.tableCount, 0),
    0,
  );
  const openCritical = countries.reduce(
    (s, c) => s + c.clients.reduce((a, x) => a + x.criticalIssues, 0),
    0,
  );

  return (
    <div>
      <h1 className="page-title">Countries</h1>
      <p className="page-sub">
        Only countries with client data are listed. New countries are added automatically when you upload
        collector data under that country.
      </p>

      <div className="kpi-grid">
        <KpiCard label="Countries" value={countries.length} />
        <KpiCard label="Clients" value={totalClients} href="/clients" />
        <KpiCard label="Devices" value={totalTables} href="/devices" />
        <KpiCard label="Critical issues" value={openCritical} />
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <table className="table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Region</th>
                <th>Clients</th>
                <th>Devices</th>
                <th>Critical</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>{" "}
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      ({c.code})
                    </span>
                  </td>
                  <td>{c.region}</td>
                  <td>{c.clients.length}</td>
                  <td>{c.clients.reduce((a, x) => a + x.tableCount, 0)}</td>
                  <td>{c.clients.reduce((a, x) => a + x.criticalIssues, 0)}</td>
                  <td>
                    <Link className="btn btn-secondary" href={`/countries/${c.code}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
