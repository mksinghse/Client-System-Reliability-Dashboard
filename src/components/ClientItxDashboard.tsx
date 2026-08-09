import type { ClientItxDashboard } from "@/lib/client-itx";
import { KpiCard } from "./KpiCard";

function toneForRamRow(item: string, value: string): string | undefined {
  if (item === "jvm_ram_pressure" && value === "RSS_NEAR_XMX") return "var(--warn-soft, #fffaeb)";
  if (item === "Heap flags" && value.includes("10240")) return "var(--warn-soft, #fffaeb)";
  return undefined;
}

function toneForLoadBucket(bucket: string): string | undefined {
  if (bucket.startsWith("<")) return "color-mix(in srgb, #ecfdf3 80%, var(--surface))";
  if (bucket.startsWith("1")) return "var(--warn-soft, #fffaeb)";
  if (bucket.startsWith("3")) return "var(--danger-soft, #fef3f2)";
  return undefined;
}

function toneForTopLoad(index: number): string | undefined {
  if (index < 4) return "var(--danger-soft, #fef3f2)";
  return "var(--warn-soft, #fffaeb)";
}

function toneForRuntime(signal: string): string | undefined {
  if (signal.includes("exited") || signal.includes("crash")) return "var(--danger-soft, #fef3f2)";
  if (signal.includes("ABSENT") && !signal.includes("cash_counter")) return "var(--warn-soft, #fffaeb)";
  if (signal.includes("running") || signal.includes("oomkilled=false") || signal.includes("gnome_crash")) {
    return "color-mix(in srgb, #ecfdf3 80%, var(--surface))";
  }
  return undefined;
}

export function ClientItxDashboardView({ data }: { data: ClientItxDashboard }) {
  return (
    <div className="stack" style={{ marginTop: "1.1rem" }}>
      <div className="row">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{data.title}</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
            {data.source} ·{" "}
            <a
              href={data.sharedCanvasUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--brand-primary)", fontWeight: 600 }}
            >
              Shared canvas
            </a>
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="SUPPORT logs parsed" value={data.stats.supportLogs} />
        <KpiCard label="Avg load1" value={data.stats.avgLoad1} />
        <KpiCard label="Dominant heap" value={data.stats.dominantHeap} hint="Fleet primary -Xmx" />
        <KpiCard label="Board (all hosts)" value={data.stats.board} />
      </div>

      <div
        className="panel"
        style={{
          borderColor: "rgba(0, 107, 129, 0.35)",
          background: "color-mix(in srgb, #e8f6f8 55%, var(--surface))",
        }}
      >
        <div className="panel-body" style={{ fontSize: "0.92rem", lineHeight: 1.5 }}>
          {data.callout}
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Motherboard & system</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.motherboard.map(([field, value, count]) => (
                <tr key={`${field}-${value}`}>
                  <td>{field}</td>
                  <td>
                    <strong>{value}</strong>
                  </td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>RAM / heap</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.ramHeap.map(([item, value, count]) => (
                <tr key={`${item}-${value}`} style={{ background: toneForRamRow(item, value) }}>
                  <td>{item}</td>
                  <td>
                    <strong>{value}</strong>
                  </td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Memory metric</th>
                <th>Avg</th>
                <th>Median</th>
                <th>Min</th>
                <th>Max</th>
                <th>P95</th>
              </tr>
            </thead>
            <tbody>
              {data.memoryMetrics.map((r) => (
                <tr key={r[0]}>
                  {r.map((cell, i) => (
                    <td key={`${r[0]}-${i}`}>{i === 0 ? cell : <strong>{cell}</strong>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Load average & CPU</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.85rem" }}>
            Distribution across SUPPORT.log hosts
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Avg</th>
                <th>Median</th>
                <th>Min</th>
                <th>Max</th>
                <th>P95</th>
              </tr>
            </thead>
            <tbody>
              {data.loadMetrics.map((r) => (
                <tr key={r[0]}>
                  {r.map((cell, i) => (
                    <td key={`${r[0]}-${i}`}>{i === 0 ? cell : <strong>{cell}</strong>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ margin: "1.25rem 0 0.5rem", fontSize: "0.95rem" }}>load1 buckets</h3>
          <table className="table">
            <thead>
              <tr>
                <th>load1 bucket</th>
                <th>Hosts</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {data.loadBuckets.map(([bucket, hosts, share]) => (
                <tr key={bucket} style={{ background: toneForLoadBucket(bucket) }}>
                  <td>{bucket}</td>
                  <td>
                    <strong>{hosts}</strong>
                  </td>
                  <td>{share}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ margin: "1.25rem 0 0.5rem", fontSize: "0.95rem" }}>Highest load1 hosts</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Host</th>
                <th>load1</th>
                <th>load1/cpu</th>
                <th>CPU used %</th>
              </tr>
            </thead>
            <tbody>
              {data.topLoad.map((r, idx) => (
                <tr key={r[0]} style={{ background: toneForTopLoad(idx) }}>
                  <td>
                    <strong>{r[0]}</strong>
                  </td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Runtime health</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Signal</th>
                <th>Count</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.runtime.map(([signal, count, notes]) => (
                <tr key={signal} style={{ background: toneForRuntime(signal) }}>
                  <td>{signal}</td>
                  <td>
                    <strong>{count}</strong>
                  </td>
                  <td className="muted">{notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.78rem" }}>
            Full export: data/sjm-itx-summary.json · SJM_ITX_host_details_20260806.csv (per-host)
          </p>
        </div>
      </div>
    </div>
  );
}
