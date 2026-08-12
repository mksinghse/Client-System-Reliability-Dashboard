import Link from "next/link";
import { DEVICE_COLUMNS, loadDevicesInventory, queryDevices } from "@/lib/devices-inventory";
import { KpiCard } from "@/components/KpiCard";
import { maskIp } from "@/lib/utils";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const result = queryDevices({
    client: sp.client,
    status: sp.status,
    q: sp.q,
    page,
    pageSize: 50,
  });
  const coverage = loadDevicesInventory().diskCoverage;
  const coverageNote = coverage
    ? `${coverage.devicesWithDiskFields ?? 0} devices with disk fields` +
      (coverage.smartLifePresent ? ` · ${coverage.smartLifePresent} with disk life (% used)` : "")
    : "";

  function hrefFor(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = {
      client: sp.client,
      status: sp.status,
      q: sp.q,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/devices?${qs}` : "/devices";
  }

  return (
    <div>
      <div className="row">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-sub">
            Table inventory from Macau master matrices. Disk manufacturer from SUPPORT.log PCI NVMe;
            disk usage from <code>df</code>; <strong>disk life = percentage used</strong>
            {coverageNote ? ` · ${coverageNote}` : ""}. IP addresses are masked as
            <code>***.***.x.x</code> (first two octets hidden).
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Shown" value={result.total} />
        <KpiCard label="Inventory total" value={result.inventoryCount} />
        <KpiCard label="Page" value={`${result.page} / ${result.totalPages}`} />
        <KpiCard label="Clients in filter" value={sp.client || "All"} />
      </div>

      <form className="panel" style={{ marginTop: "1rem" }} action="/devices" method="get">
        <div className="panel-body" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="client">Client</label>
            <select id="client" name="client" defaultValue={sp.client ?? ""}>
              <option value="">All clients</option>
              {result.clients.map((c) => (
                <option key={c} value={c}>
                  {c} ({result.byClient[c] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""}>
              <option value="">All</option>
              <option value="OK">OK / Healthy</option>
              <option value="FAILED">FAILED / Critical</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="table, IP, board, OS…" />
          </div>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-body">
          <div className="table-scroll">
            <table className="table table--dense">
              <thead>
                <tr>
                  {DEVICE_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.devices.map((d) => (
                  <tr key={`${d.client}-${d.ip}-${d.table_name}-${d.hostname}`}>
                    {DEVICE_COLUMNS.map((c) => (
                      <td key={c.key}>{c.key === "ip" ? maskIp(d.ip) : d[c.key] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {result.total.toLocaleString()} device(s)
            </span>
            <div className="row">
              {result.page > 1 ? (
                <Link className="btn btn-secondary" href={hrefFor({ page: String(result.page - 1) })}>
                  Previous
                </Link>
              ) : null}
              {result.page < result.totalPages ? (
                <Link className="btn btn-secondary" href={hrefFor({ page: String(result.page + 1) })}>
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
