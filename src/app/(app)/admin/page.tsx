import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { KpiCard } from "@/components/KpiCard";
import { relativeTime } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getSession();
  const [clients, countries, uploads, failed, audits] = await Promise.all([
    prisma.client.count({ where: { archived: false } }),
    prisma.country.count(),
    prisma.collectorUpload.count(),
    prisma.collectorUpload.count({ where: { status: "FAILED" } }),
    prisma.auditLog.findMany({ take: 12, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  const missingData = await prisma.client.count({
    where: { archived: false, OR: [{ lastUploadAt: null }, { tableCount: 0 }] },
  });

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
        <Link href="/admin/clients" className="client-tile">
          <strong>Client Management</strong>
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
            Add, edit, and archive clients across countries.
          </p>
        </Link>
        <Link href="/admin/countries" className="client-tile">
          <strong>Country Management</strong>
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
            Maintain country hierarchy and regional assignment.
          </p>
        </Link>
        <Link href="/admin/uploads" className="client-tile">
          <strong>Collector Upload Center</strong>
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
            Upload Offline Table Diagnostic Collector outputs.
          </p>
        </Link>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Data Quality Dashboard</h2>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <div className="row"><span className="muted">Missing / stale collector data</span><strong>{missingData}</strong></div>
              <div className="row"><span className="muted">Failed imports</span><strong>{failed}</strong></div>
              <div className="row"><span className="muted">Validation coverage</span><strong>{uploads ? Math.round(((uploads - failed) / uploads) * 100) : 100}%</strong></div>
              <div className="row"><span className="muted">Synchronization status</span><strong>Seed + Upload driven</strong></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Audit Logs</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>User</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.action}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{a.details}</div>
                    </td>
                    <td>{a.user?.email ?? "system"}</td>
                    <td>{relativeTime(a.createdAt)}</td>
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
