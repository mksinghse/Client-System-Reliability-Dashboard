"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Series = {
  key: string;
  name: string;
  color: string;
};

export function GroupedBarChart({
  data,
  series,
  yLabel,
}: {
  data: Array<Record<string, string | number>>;
  series: Series[];
  yLabel?: string;
}) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="client" tick={{ fontSize: 11 }} stroke="var(--muted)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted)"
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "var(--muted)" } }
                : undefined
            }
          />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
