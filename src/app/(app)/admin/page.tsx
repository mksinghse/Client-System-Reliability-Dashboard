import Link from "next/link";
import { store } from "@/lib/ddb/store";
import { getSession } from "@/lib/auth";
import { KpiCard } from "@/components/KpiCard";
import { relativeTime } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getSession();
  const clientsList = await store.listClients({ archived: false });
  const [uploads, failed, audits] = await Promise.all([
    store.countUploads(),
    store.countUploads("FAILED"),
    store.listAudits(12),
  ]);
  const clients = clientsList.length;
  const countries = new Set(clientsList.map((c) => c.countryId)).size;
  const missingData = clientsList.filter((c) => !c.lastUploadAt || c.tableCount === 0).length;

  return (
    <div>
      <div className="row">
        <div>
          <h1 className="page-title">Administration Portal</h1>
          <p className="page-sub">
            Restricted controls for client/country management, collector ingestion, data quality, and audit.
          </p>
        </div>
        <span className="badge warning">Role: {session?.role ?? "VIEWER"}</span>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Active Clients" value={clients} />
        <KpiCard label="Countries" value={countries} />
        <KpiCard label="Collector Uploads" value={uploads} />
        <KpiCard label="Failed Imports" value={failed} />
      </div>

      <div className="grid-3">
        <Link href="/admin/uploads" className="client-tile">
          <strong>Uploads</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            ZIP / SUPPORT.log / JSON ingest
          </p>
        </Link>
        <Link href="/admin/clients" className="client-tile">
          <strong>Clients</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Create and manage clients
          </p>
        </Link>
        <Link href="/admin/countries" className="client-tile">
          <strong>Countries</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Geography catalog
          </p>
        </Link>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Data quality</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              <div className="row">
                <span className="muted">Missing / stale collector data</span>
                <strong>{missingData}</strong>
              </div>
              <div className="row">
                <span className="muted">Validation coverage</span>
                <strong>{uploads ? Math.round(((uploads - failed) / uploads) * 100) : 100}%</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Recent audit</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {audits.length ? (
                audits.map((a) => (
                  <div key={a.id} className="row" style={{ alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "0.88rem" }}>{a.action}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>
                        {a.user?.email ?? "system"} · {relativeTime(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No audit events yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
