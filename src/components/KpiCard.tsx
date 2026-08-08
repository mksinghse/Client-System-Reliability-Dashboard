export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="panel kpi-card">
      <div className="panel-body">
        <h3>{label}</h3>
        <strong>{value}</strong>
        {hint ? <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>{hint}</p> : null}
      </div>
    </div>
  );
}
