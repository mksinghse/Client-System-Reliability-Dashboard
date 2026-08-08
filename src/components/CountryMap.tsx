"use client";

export function CountryMap({
  points,
}: {
  points: Array<{
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    tables: number;
    avgHealth: number;
  }>;
}) {
  return (
    <div className="map-wrap">
      {points.map((p) => {
        const left = ((p.longitude + 180) / 360) * 100;
        const top = ((90 - p.latitude) / 180) * 100;
        return (
          <div key={p.code} className="map-point" style={{ left: `${left}%`, top: `${top}%` }} title={p.name}>
            <span>
              {p.code} · {p.avgHealth}
            </span>
          </div>
        );
      })}
    </div>
  );
}
