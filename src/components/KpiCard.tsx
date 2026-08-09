import Link from "next/link";

export function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="panel-body">
      <h3>{label}</h3>
      <strong>{value}</strong>
      {hint ? (
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="panel kpi-card kpi-card--link">
        {body}
      </Link>
    );
  }

  return <div className="panel kpi-card">{body}</div>;
}
