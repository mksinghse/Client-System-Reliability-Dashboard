"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrendChart({ data }: { data: Array<{ date: string; score: number }> }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006b81" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#006b81" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted)" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted)" />
          <Tooltip />
          <Area type="monotone" dataKey="score" stroke="#006b81" fill="url(#scoreFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
