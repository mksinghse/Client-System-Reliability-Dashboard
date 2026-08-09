import { store } from "@/lib/ddb/store";
import { ClientAdminForm } from "@/components/ClientAdminForm";
import { HealthBadge } from "@/components/HealthBadge";
import { relativeTime } from "@/lib/utils";

export default async function AdminClientsPage() {
  const [clients, countries] = await Promise.all([
    store.listClients(),
    store.listCountries(),
  ]);
  clients.sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="page-title">Client Management</h1>
      <p className="page-sub">Add, edit, and archive clients in the production hierarchy.</p>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Add Client</h2>
            <ClientAdminForm countries={countries.map((c) => ({ id: c.id, name: c.name }))} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Directory</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Country</th>
                  <th>Health</th>
                  <th>Tables</th>
                  <th>Updated</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{c.code}</div>
                    </td>
                    <td>{c.country.name}</td>
                    <td><HealthBadge status={c.healthStatus} /></td>
                    <td>{c.tableCount}</td>
                    <td>{relativeTime(c.lastUploadAt)}</td>
                    <td>{c.archived ? "Archived" : "Active"}</td>
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
