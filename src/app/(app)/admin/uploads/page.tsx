import { store } from "@/lib/ddb/store";
import { UploadForm } from "@/components/UploadForm";
import { COUNTRY_CATALOG } from "@/lib/country-catalog";
import { relativeTime } from "@/lib/utils";

export default async function UploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sp = await searchParams;
  const clients = await store.listClients({ archived: false });
  const countryIds = new Set(clients.map((c) => c.countryId));
  const allCountries = await store.listCountries();
  const existingCountries = allCountries.filter((c) => countryIds.has(c.id));
  const history = await store.listUploads({ take: 20 });

  return (
    <div>
      <h1 className="page-title">Collector Upload Center</h1>
      <p className="page-sub">
        Upload a collector <strong>.zip</strong> (extracted automatically), single{" "}
        <code>*_SUPPORT.log</code>, or mapped collector JSON from the{" "}
        <a
          href="https://wdtablesystems.atlassian.net/wiki/spaces/SEKB/pages/5713002543/WDTS+Offline+Table+Diagnostic+Collector+Run+from+SharePoint"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--brand-primary)", fontWeight: 600 }}
        >
          WDTS Offline Table Diagnostic Collector
        </a>
        . Choose an existing client, or enter country + client during upload — new countries are created
        automatically and then appear on the Countries page.
      </p>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Upload Collector Logs</h2>
            <UploadForm
              clients={clients.map((c) => ({
                id: c.id,
                name: c.name,
                code: c.code,
                countryId: c.countryId,
                countryCode: c.country.code,
                countryName: c.country.name,
              }))}
              catalogCountries={COUNTRY_CATALOG.map((c) => ({
                code: c.code,
                name: c.name,
                region: c.region,
              }))}
              existingCountries={existingCountries.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                region: c.region,
              }))}
              initialClientId={sp.clientId}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Accepted packages</h2>
            <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
              ZIP archives are extracted server-side. Each <code>*_SUPPORT.log</code> becomes a table
              row (hostname, CPU/mem/disk, JVM pressure, bacctable). Collector JSON still works as
              before.
            </p>
            <pre
              style={{
                marginTop: 12,
                background: "var(--surface-2)",
                borderRadius: 10,
                padding: "0.85rem",
                overflow: "auto",
                fontSize: "0.78rem",
                lineHeight: 1.45,
              }}
            >{`{
  "collectorVersion": "1.2.0",
  "clientCode": "SJM",
  "environment": "Production",
  "tables": [
    {
      "tableName": "WHSJMBA01-92bb",
      "tableCode": "SJM-WHSJMBA01-92bb",
      "osInfo": "Rocky Linux 9.6",
      "cpuUsage": 42,
      "memoryUsage": 88,
      "serviceStatus": "Running"
    }
  ]
}`}</pre>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Processing History</h2>
          {history.length ? (
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Parsed</th>
                  <th>Error</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.fileName}</td>
                    <td>{h.client?.name ?? "—"}</td>
                    <td>{h.status}</td>
                    <td>{h.parsedTables}</td>
                    <td className="muted">{h.errorMessage ?? "—"}</td>
                    <td>{relativeTime(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted" style={{ margin: "12px 0 0" }}>
              No uploads yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
