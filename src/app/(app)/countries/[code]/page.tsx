import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "@/lib/ddb/store";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiCard } from "@/components/KpiCard";
import { relativeTime } from "@/lib/utils";

export default async function CountryDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const country = await store.getCountryByCode(code.toUpperCase());
  if (!country) notFound();
  const clients = (await store.listClients({ archived: false, countryId: country.id })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const tables = clients.reduce((s, c) => s + c.tableCount, 0);
  const critical = clients.reduce((s, c) => s + c.criticalIssues, 0);
  const health = clients.length
    ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length)
    : 100;
  const lastRefresh = clients
    .map((c) => c.lastUploadAt)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0];

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
      </div>

      <div className="kpi-grid">
        <KpiCard label="Clients" value={clients.length} />
        <KpiCard label="Devices" value={tables} />
        <KpiCard label="Avg health" value={health} />
        <KpiCard label="Critical" value={critical} />
        <KpiCard label="Last refresh" value={relativeTime(lastRefresh)} />
      </div>

      <div className="client-grid" style={{ marginTop: "1rem" }}>
        {clients.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="client-tile">
            <div className="row">
              <strong>{c.name}</strong>
              <HealthBadge status={c.healthStatus} />
            </div>
            <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.85rem" }}>
              {c.tableCount} devices · {c.criticalIssues} critical · {relativeTime(c.lastUploadAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
