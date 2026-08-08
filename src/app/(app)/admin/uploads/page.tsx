import { prisma } from "@/lib/db";
import { UploadForm } from "@/components/UploadForm";
import { relativeTime } from "@/lib/utils";

export default async function UploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sp = await searchParams;
  const clients = await prisma.client.findMany({
    where: { archived: false },
    include: { country: true },
    orderBy: { name: "asc" },
  });
  const history = await prisma.collectorUpload.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  return (
    <div>
      <h1 className="page-title">Collector Upload Center</h1>
      <p className="page-sub">
        Import WDTS Offline Table Diagnostic Collector JSON output. The file is associated with a client, parsed, and used to refresh metrics, health, diagnostics, and history.
      </p>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Upload Collector Logs</h2>
            <UploadForm
              clients={clients.map((c) => ({ id: c.id, name: `${c.country.name} · ${c.name}` }))}
              initialClientId={sp.clientId}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Sample Payload Shape</h2>
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
  "collectorVersion": "1.0.0",
  "clientCode": "US-VGC",
  "environment": "Production",
  "tables": [
    {
      "tableName": "Table 001",
      "tableCode": "US-VGC-T001",
      "cpuUsage": 42,
      "memoryUsage": 61,
      "firmwareVer": "FW-4.2.1",
      "serviceStatus": "Running",
      "peripherals": [{"name":"RFID","type":"RFID","status":"OK"}],
      "logs": [{"level":"WARN","category":"Hardware","message":"Sensor drift"}]
    }
  ]
}`}</pre>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Processing History</h2>
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
                  <td>{h.client.name}</td>
                  <td>{h.status}</td>
                  <td>{h.parsedTables}</td>
                  <td className="muted">{h.errorMessage ?? "—"}</td>
                  <td>{relativeTime(h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
