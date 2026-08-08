"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  HEALTHY: "#0a8a5a",
  WARNING: "#c47f17",
  CRITICAL: "#c81e1e",
  OFFLINE: "#667085",
};

export function HealthPie({
  data,
}: {
  data: Array<{ name: string; value: number; key: string }>;
}) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] ?? "#667085"} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
