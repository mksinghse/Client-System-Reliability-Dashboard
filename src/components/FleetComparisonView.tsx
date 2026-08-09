import Link from "next/link";
import { HealthBadge } from "./HealthBadge";
import { KpiCard } from "./KpiCard";
import { GroupedBarChart } from "./charts/GroupedBarChart";
import type { DeviceInfoClient } from "@/lib/device-info-comparison";

function rowTone(okPct: number, failed: number): string | undefined {
  if (failed === 0) return undefined;
  if (okPct < 95) return "var(--danger-soft, #fef3f2)";
  return "var(--warn-soft, #fffaeb)";
}

function thermalNote(c: DeviceInfoClient): string {
  if (c.client === "MGM") return "29 hot hosts; several at 100°C";
  if (c.client === "Melco") return "Coolest fleet";
  if (c.client === "SJM") return "Healthy under 10240M heap";
  if (c.hot70 > 0) return "Check outliers";
  return "Within range";
}

const OS_NOTES: Record<string, string> = {
  GM: "Also 9.6 / 9.5 / 8.10",
  Melco: "Mostly 9.x (9.6+9.5)",
  SJM: "Also 8.9 (309) / 9.5 (261) — largest fleet",
  SW: "Smallest fleet; 100% OK",
  Wynn: "Also 9.6 / 9.5",
  MGM: "Fully on 9.6",
};

export function FleetComparisonView({
  clients,
  clientIdsByCode,
}: {
  clients: DeviceInfoClient[];
  clientIdsByCode: Record<string, string>;
}) {
  const fleetTotal = clients.reduce((s, c) => s + c.total, 0);
  const fleetOk = clients.reduce((s, c) => s + c.ok, 0);
  const fleetFailed = clients.reduce((s, c) => s + c.failed, 0);

  const healthChart = clients.map((c) => ({
    client: c.client,
    ok: c.ok,
    failed: c.failed,
  }));

  const tempChart = clients.map((c) => ({
    client: c.client,
    tempAvg: c.tempAvg,
  }));

  return (
    <div className="stack" style={{ marginTop: "1.1rem" }}>
      <div className="kpi-grid">
        <KpiCard label="Total devices" value={fleetTotal} />
        <KpiCard label="OK" value={fleetOk} />
        <KpiCard label="FAILED" value={fleetFailed} />
        <KpiCard label="Clients" value={clients.length} />
      </div>

      <div
        className="panel"
        style={{
          borderColor: "rgba(181, 71, 8, 0.35)",
          background: "color-mix(in srgb, #fffaeb 70%, var(--surface))",
        }}
      >
        <div className="panel-body" style={{ fontSize: "0.92rem", lineHeight: 1.5 }}>
          <strong>SJM stands out on heap:</strong> 10240M on uniform 16GB TeamGroup (927 devices).
          GM uses 8192M. Melco/SW/Wynn use 4096M. MGM is the HW outlier — mixed 8/16/32GB and
          DDR3+DDR4 — fleet max heap 4096M.
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Fleet health</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.85rem" }}>
            Devices by client (OK vs FAILED) · Source: device-info client comparison canvas
          </p>
          <GroupedBarChart
            data={healthChart}
            yLabel="Devices"
            series={[
              { key: "ok", name: "OK", color: "#0f766e" },
              { key: "failed", name: "FAILED", color: "#b42318" },
            ]}
          />
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Total</th>
                <th>OK</th>
                <th>FAILED</th>
                <th>OK %</th>
                <th>Collected</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const id = clientIdsByCode[c.client];
                return (
                  <tr key={c.client} style={{ background: rowTone(c.okPct, c.failed) }}>
                    <td>
                      <strong>{c.client}</strong>
                    </td>
                    <td>{c.total}</td>
                    <td>{c.ok}</td>
                    <td>{c.failed}</td>
                    <td>
                      <HealthBadge
                        status={
                          c.okPct >= 99
                            ? "HEALTHY"
                            : c.okPct >= 95
                              ? "WARNING"
                              : c.okPct >= 90
                                ? "CRITICAL"
                                : "OFFLINE"
                        }
                      />{" "}
                      {c.okPct}%
                    </td>
                    <td>{c.collected}</td>
                    <td>
                      {id ? (
                        <Link href={`/clients/${id}`} className="muted" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                          Detail →
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Memory & heap</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>RAM profile</th>
                <th>Type</th>
                <th>Brand(s)</th>
                <th>Heap now</th>
                <th>Fleet max heap</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.client}
                  style={{
                    background:
                      c.client === "SJM"
                        ? "var(--danger-soft, #fef3f2)"
                        : c.ramUniform
                          ? undefined
                          : "var(--warn-soft, #fffaeb)",
                  }}
                >
                  <td>
                    <strong>{c.client}</strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {c.ramUniform ? "Uniform 16GB" : "Mixed tiers"}
                    </div>
                  </td>
                  <td>{c.ram}</td>
                  <td>{c.type}</td>
                  <td style={{ maxWidth: 280 }}>{c.brands}</td>
                  <td>
                    <strong>{c.heapNow}</strong>
                  </td>
                  <td>{c.fleetMax}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="panel" style={{ margin: 0, boxShadow: "none" }}>
              <div className="panel-body">
                <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Heap ladder (16GB fleets)</h3>
                <ul className="stack-sm" style={{ margin: "12px 0 0", paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
                  <li>
                    <strong>SJM 10240M</strong> — highest in production (tight ~6GB OS headroom).
                  </li>
                  <li>
                    <strong>GM 8192M</strong> — proven high setting with more headroom.
                  </li>
                  <li>
                    <strong>Melco / SW / Wynn 4096M</strong> — conservative default.
                  </li>
                  <li>
                    <strong>MGM 4096M max</strong> — limited by 8GB DDR3 majority, not by choice.
                  </li>
                </ul>
              </div>
            </div>
            <div className="panel" style={{ margin: 0, boxShadow: "none" }}>
              <div className="panel-body">
                <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Shared canvas</h3>
                <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  View mirrors{" "}
                  <a
                    href="https://cursor.com/dashboard/shared-canvases?shareId=canvas-szeHiyahHezyrQfUWMptjTgc"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--brand-primary)", fontWeight: 600 }}
                  >
                    Device Info Client Comparison
                  </a>
                  . Data file: <code>data/device-info-client-comparison.json</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Thermal comparison</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.85rem" }}>
            Average max temperature by client (°C)
          </p>
          <GroupedBarChart
            data={tempChart}
            yLabel="°C"
            series={[{ key: "tempAvg", name: "Avg max temp (°C)", color: "#006b81" }]}
          />
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Avg °C</th>
                <th>Max °C</th>
                <th>Hosts ≥70°C</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.client}
                  style={{
                    background:
                      c.tempMax >= 90
                        ? "var(--danger-soft, #fef3f2)"
                        : c.hot70 > 0
                          ? "var(--warn-soft, #fffaeb)"
                          : undefined,
                  }}
                >
                  <td>
                    <strong>{c.client}</strong>
                  </td>
                  <td>{c.tempAvg}</td>
                  <td>{c.tempMax}</td>
                  <td>{c.hot70}</td>
                  <td>{thermalNote(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>OS mix (OK hosts)</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Primary OS</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.client}>
                  <td>
                    <strong>{c.client}</strong>
                  </td>
                  <td>{c.osPrimary.replace(/^RL /, "Rocky ")}</td>
                  <td>{OS_NOTES[c.client] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.78rem" }}>
            SJM source: SJM_device_info_summary/full_20260803_121908. SW remains a separate client from
            SW_device_info_*. Fleet total {fleetTotal} devices.
          </p>
        </div>
      </div>
    </div>
  );
}
