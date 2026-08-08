"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendChart } from "./charts/TrendChart";

type ClientOption = { id: string; name: string; country: string; countryCode: string };

type Comparison = {
  clients: Array<{
    id: string;
    name: string;
    country: string;
    healthScore: number;
    tableCount: number;
    criticalIssues: number;
    warningIssues: number;
    availabilityPct: number;
    cpuUtilization: number;
    openFindings: number;
    trend: Array<{ date: string; score: number }>;
  }>;
  benchmarks: {
    bestPerforming: { name: string } | null;
    mostStable: { name: string } | null;
    highestRisk: { name: string } | null;
    mostFrequentIssues: { name: string } | null;
  };
};

export function CompareClient({
  clients,
  initialIds,
  comparison,
}: {
  clients: ClientOption[];
  initialIds: string[];
  comparison: Comparison;
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(initialIds);
  const [pending, startTransition] = useTransition();

  const metrics = useMemo(
    () => [
      { key: "healthScore", label: "Health Score" },
      { key: "tableCount", label: "Table Count" },
      { key: "criticalIssues", label: "Critical Issues" },
      { key: "warningIssues", label: "Warning Issues" },
      { key: "availabilityPct", label: "Availability %" },
      { key: "cpuUtilization", label: "CPU Utilization %" },
      { key: "openFindings", label: "Open Findings" },
    ],
    [],
  );

  function updateId(index: number, value: string) {
    const next = [...ids];
    next[index] = value;
    setIds(next);
  }

  function addSlot() {
    if (ids.length >= 4) return;
    const unused = clients.find((c) => !ids.includes(c.id));
    if (unused) setIds([...ids, unused.id]);
  }

  function runCompare() {
    startTransition(() => {
      router.push(`/compare?ids=${ids.filter(Boolean).join(",")}`);
    });
  }

  return (
    <div className="stack" style={{ marginTop: "1.1rem" }}>
      <div className="panel">
        <div className="panel-body">
          <div className="row">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Select clients</h2>
            <div className="row">
              <button className="btn btn-secondary" type="button" onClick={addSlot} disabled={ids.length >= 4}>
                Add client
              </button>
              <button className="btn btn-primary" type="button" onClick={runCompare} disabled={pending || ids.length < 2}>
                {pending ? "Comparing…" : "Compare"}
              </button>
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: 12 }}>
            {ids.map((id, idx) => (
              <div className="field" key={`${id}-${idx}`} style={{ marginBottom: 0 }}>
                <label>Client {idx + 1}</label>
                <select value={id} onChange={(e) => updateId(idx, e.target.value)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.country} · {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Side-by-Side Comparison</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Metric</th>
                {comparison.clients.map((c) => (
                  <th key={c.id}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Country</td>
                {comparison.clients.map((c) => (
                  <td key={c.id}>{c.country}</td>
                ))}
              </tr>
              {metrics.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  {comparison.clients.map((c) => {
                    const value = {
                      healthScore: c.healthScore,
                      tableCount: c.tableCount,
                      criticalIssues: c.criticalIssues,
                      warningIssues: c.warningIssues,
                      availabilityPct: c.availabilityPct,
                      cpuUtilization: c.cpuUtilization,
                      openFindings: c.openFindings,
                    }[m.key];
                    return (
                      <td key={c.id}>
                        <strong>{value}</strong>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Benchmark View</h2>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <div className="row"><span className="muted">Best Performing</span><strong>{comparison.benchmarks.bestPerforming?.name ?? "—"}</strong></div>
              <div className="row"><span className="muted">Most Stable</span><strong>{comparison.benchmarks.mostStable?.name ?? "—"}</strong></div>
              <div className="row"><span className="muted">Highest Risk</span><strong>{comparison.benchmarks.highestRisk?.name ?? "—"}</strong></div>
              <div className="row"><span className="muted">Most Frequent Issues</span><strong>{comparison.benchmarks.mostFrequentIssues?.name ?? "—"}</strong></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Trend View</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.85rem" }}>
              Historical health score for first selected client
            </p>
            <TrendChart data={comparison.clients[0]?.trend ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
