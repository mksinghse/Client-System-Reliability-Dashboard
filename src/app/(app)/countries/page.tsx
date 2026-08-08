import Link from "next/link";
import { prisma } from "@/lib/db";
import { KpiCard } from "@/components/KpiCard";

export default async function CountriesPage() {
  const countries = await prisma.country.findMany({
    include: {
      clients: {
        where: { archived: false },
        select: {
          id: true,
          tableCount: true,
          criticalIssues: true,
          healthScore: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Countries</h1>
      <p className="page-sub">Drill into country-level inventory, health score, and client portfolios.</p>

      <div className="kpi-grid">
        <KpiCard label="Total Countries" value={countries.length} />
        <KpiCard label="Total Clients" value={countries.reduce((s, c) => s + c.clients.length, 0)} />
        <KpiCard label="Total Tables" value={countries.reduce((s, c) => s + c.clients.reduce((a, x) => a + x.tableCount, 0), 0)} />
        <KpiCard label="Open Critical" value={countries.reduce((s, c) => s + c.clients.reduce((a, x) => a + x.criticalIssues, 0), 0)} />
      </div>

      <div className="client-grid">
        {countries.map((country) => {
          const tables = country.clients.reduce((s, c) => s + c.tableCount, 0);
          const critical = country.clients.reduce((s, c) => s + c.criticalIssues, 0);
          const health = country.clients.length
            ? Math.round(country.clients.reduce((s, c) => s + c.healthScore, 0) / country.clients.length)
            : 100;
          return (
            <Link key={country.id} href={`/countries/${country.code}`} className="client-tile">
              <div className="row">
                <strong style={{ fontSize: "1.05rem", color: "var(--ink)" }}>{country.name}</strong>
                <span className="badge healthy">{country.code}</span>
              </div>
              <p className="muted" style={{ margin: "0.45rem 0 0.8rem", fontSize: "0.85rem" }}>
                {country.region}
              </p>
              <div className="stack-sm" style={{ fontSize: "0.9rem" }}>
                <div className="row"><span className="muted">Clients</span><strong>{country.clients.length}</strong></div>
                <div className="row"><span className="muted">Tables</span><strong>{tables}</strong></div>
                <div className="row"><span className="muted">Health Score</span><strong>{health}</strong></div>
                <div className="row"><span className="muted">Critical Issues</span><strong>{critical}</strong></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
