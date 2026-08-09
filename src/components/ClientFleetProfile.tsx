import type { DeviceInfoClient } from "@/lib/device-info-comparison";
import { KpiCard } from "./KpiCard";
import { HealthBadge } from "./HealthBadge";

export function ClientFleetProfile({ info }: { info: DeviceInfoClient }) {
  const status =
    info.okPct >= 99 ? "HEALTHY" : info.okPct >= 95 ? "WARNING" : info.okPct >= 90 ? "CRITICAL" : "OFFLINE";

  return (
    <div className="stack" style={{ marginTop: "1.1rem" }}>
      <div className="kpi-grid">
        <KpiCard label="Devices" value={info.total} />
        <KpiCard label="OK" value={info.ok} />
        <KpiCard label="FAILED" value={info.failed} />
        <KpiCard label="OK %" value={`${info.okPct}%`} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Memory & heap</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                <tr>
                  <td>RAM profile</td>
                  <td>
                    <strong>{info.ram}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Type</td>
                  <td>{info.type}</td>
                </tr>
                <tr>
                  <td>Brand(s)</td>
                  <td>{info.brands}</td>
                </tr>
                <tr>
                  <td>Heap now</td>
                  <td>
                    <strong>{info.heapNow}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Fleet max heap</td>
                  <td>{info.fleetMax}</td>
                </tr>
                <tr>
                  <td>Uniformity</td>
                  <td>{info.ramUniform ? "Uniform 16GB" : "Mixed tiers"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Thermal & OS</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                <tr>
                  <td>Scan health</td>
                  <td>
                    <HealthBadge status={status} /> {info.okPct}%
                  </td>
                </tr>
                <tr>
                  <td>Temp avg / max</td>
                  <td>
                    {info.tempAvg}°C / {info.tempMax}°C
                  </td>
                </tr>
                <tr>
                  <td>Hosts ≥70°C</td>
                  <td>
                    <strong>{info.hot70}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Primary OS</td>
                  <td>{info.osPrimary.replace(/^RL /, "Rocky ")}</td>
                </tr>
                <tr>
                  <td>Collected</td>
                  <td>{info.collected}</td>
                </tr>
              </tbody>
            </table>
            <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.85rem" }}>
              Upload Offline Table Diagnostic Collector SUPPORT.log JSON for a full ITX-style host dashboard
              (see SJM client for the reference layout).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
