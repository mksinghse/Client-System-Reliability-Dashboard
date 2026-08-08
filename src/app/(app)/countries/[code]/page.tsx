import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiCard } from "@/components/KpiCard";
import { relativeTime } from "@/lib/utils";

export default async function CountryDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const country = await prisma.country.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      clients: {
        where: { archived: false },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!country) notFound();

  const tables = country.clients.reduce((s, c) => s + c.tableCount, 0);
  const critical = country.clients.reduce((s, c) => s + c.criticalIssues, 0);
  const health = country.clients.length
    ? Math.round(country.clients.reduce((s, c) => s + c.healthScore, 0) / country.clients.length)
    : 100;
  const lastRefresh = country.clients
    .map((c) => c.lastUploadAt)
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];

  return (
    <div>
      <div className="row">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            <Link href="/countries">Countries</Link> / {country.code}
          </p>
          <h1 className="page-title">{country.name}</h1>
          <p className="page-sub">Country summary with client tiles for fast operational triage.</p>
        </div>
        <Link className="btn btn-secondary" href="/compare">
          Compare clients
        </Link>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Client Count" value={country.clients.length} />
        <KpiCard label="Hardware Inventory" value={tables} />
        <KpiCard label="Health Score" value={health} />
        <KpiCard label="Open Critical Issues" value={critical} hint={`Last refresh ${relativeTime(lastRefresh)}`} />
      </div>

      <h2 style={{ margin: "1.4rem 0 0", fontSize: "1.1rem" }}>Clients</h2>
      <div className="client-grid">
        {country.clients.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`} className="client-tile">
            <div className="row">
              <strong style={{ color: "var(--ink)" }}>{client.name}</strong>
              <HealthBadge status={client.healthStatus} />
            </div>
            <div className="stack-sm" style={{ marginTop: "0.85rem", fontSize: "0.9rem" }}>
              <div className="row"><span className="muted">Tables</span><strong>{client.tableCount}</strong></div>
              <div className="row"><span className="muted">Critical Issues</span><strong>{client.criticalIssues}</strong></div>
              <div className="row"><span className="muted">Last Update</span><strong>{relativeTime(client.lastUploadAt)}</strong></div>
              <div className="row"><span className="muted">Availability</span><strong>{client.availabilityPct}%</strong></div>
            </div>
            <div style={{ marginTop: "0.9rem", color: "var(--brand-primary)", fontWeight: 700, fontSize: "0.88rem" }}>
              View Details →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
