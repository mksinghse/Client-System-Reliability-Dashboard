import Link from "next/link";
import { prisma } from "@/lib/db";
import { HealthBadge } from "@/components/HealthBadge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [countries, clients, tables] = query
    ? await Promise.all([
        prisma.country.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { code: { contains: query.toUpperCase() } },
              { region: { contains: query } },
            ],
          },
          take: 20,
        }),
        prisma.client.findMany({
          where: {
            archived: false,
            OR: [
              { name: { contains: query } },
              { code: { contains: query.toUpperCase() } },
            ],
          },
          include: { country: true },
          take: 20,
        }),
        prisma.hardwareTable.findMany({
          where: {
            OR: [
              { tableName: { contains: query } },
              { tableCode: { contains: query.toUpperCase() } },
            ],
          },
          include: { client: true },
          take: 20,
        }),
      ])
    : [[], [], []];

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
                  <Link key={c.id} href={`/countries/${c.code}`} style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
                    {c.name} ({c.code})
                  </Link>
                ))
              ) : (
                <p className="muted">No countries</p>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Clients</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {clients.length ? (
                clients.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="row" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 8 }}>
                    <span>
                      <strong>{c.name}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{c.country.name}</div>
                    </span>
                    <HealthBadge status={c.healthStatus} />
                  </Link>
                ))
              ) : (
                <p className="muted">No clients</p>
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
                  <Link key={t.id} href={`/clients/${t.clientId}`} className="row">
                    <span>
                      <strong>{t.tableName}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{t.tableCode}</div>
                    </span>
                    <HealthBadge status={t.status} />
                  </Link>
                ))
              ) : (
                <p className="muted">No tables</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
