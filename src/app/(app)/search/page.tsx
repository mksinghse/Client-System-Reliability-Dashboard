import Link from "next/link";
import { store } from "@/lib/ddb/store";
import { HealthBadge } from "@/components/HealthBadge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  let countries: Awaited<ReturnType<typeof store.listCountries>> = [];
  let clients: Awaited<ReturnType<typeof store.listClients>> = [];
  let tables: Array<{
    id: string;
    tableName: string;
    tableCode: string;
    status: import("@/lib/models").HealthStatus;
    clientId: string;
    clientName: string;
  }> = [];

  if (query) {
    countries = (await store.listCountries())
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query) ||
          c.region.toLowerCase().includes(query),
      )
      .slice(0, 20);
    clients = (await store.listClients({ archived: false }))
      .filter(
        (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query),
      )
      .slice(0, 20);
    for (const c of await store.listClients({ archived: false })) {
      const rows = await store.listTables(c.id);
      for (const t of rows) {
        if (
          t.tableName.toLowerCase().includes(query) ||
          t.tableCode.toLowerCase().includes(query)
        ) {
          tables.push({
            id: t.id,
            tableName: t.tableName,
            tableCode: t.tableCode,
            status: t.status,
            clientId: c.id,
            clientName: c.name,
          });
        }
      }
    }
    tables = tables.slice(0, 20);
  }

  return (
    <div>
      <h1 className="page-title">Search</h1>
      <p className="page-sub">Results for “{query || "…"}” across countries, clients, and hardware tables.</p>

      <div className="grid-3">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Countries</h2>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              {countries.length ? (
                countries.map((c) => (
                  <Link key={c.id} href={`/countries/${c.code}`}>
                    {c.name} ({c.code})
                  </Link>
                ))
              ) : (
                <p className="muted">No matches</p>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Clients</h2>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              {clients.length ? (
                clients.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`}>
                    {c.name} · {c.country.name}
                  </Link>
                ))
              ) : (
                <p className="muted">No matches</p>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Tables</h2>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              {tables.length ? (
                tables.map((t) => (
                  <div key={t.id} className="row">
                    <Link href={`/clients/${t.clientId}`}>{t.tableName}</Link>
                    <HealthBadge status={t.status} />
                  </div>
                ))
              ) : (
                <p className="muted">No matches</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
