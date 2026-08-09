import { store } from "@/lib/ddb/store";
import { compareClients } from "@/lib/analytics";
import { CompareClient } from "@/components/CompareClient";
import { FleetComparisonView } from "@/components/FleetComparisonView";
import {
  COMPARISON_CODE_BY_NAME,
  getDeviceInfoFleetSummary,
} from "@/lib/device-info-comparison";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const sp = await searchParams;
  const fleet = getDeviceInfoFleetSummary();
  const allClients = await store.listClients({ archived: false });
  allClients.sort(
    (a, b) =>
      a.country.name.localeCompare(b.country.name) || a.name.localeCompare(b.name),
  );

  const clientIdsByCode: Record<string, string> = {};
  for (const c of allClients) {
    const shortName = Object.entries(COMPARISON_CODE_BY_NAME).find(([, code]) => code === c.code)?.[0];
    if (shortName) clientIdsByCode[shortName] = c.id;
  }

  const selected = (sp.ids ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);

  const initialIds =
    selected.length >= 2 ? selected : allClients.slice(0, Math.min(2, allClients.length)).map((c) => c.id);

  const comparison = initialIds.length >= 2 ? await compareClients(initialIds) : null;

  return (
    <div>
      <h1 className="page-title">Client device comparison</h1>
      <p className="page-sub">
        Source: device info scans · GM / Melco / SJM / SW / Wynn (2026-08-03) · MGM (2026-08-04) ·{" "}
        {fleet.fleetTotal} devices — aligned with the shared{" "}
        <a
          href="https://cursor.com/dashboard/shared-canvases?shareId=canvas-szeHiyahHezyrQfUWMptjTgc"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--brand-primary)", fontWeight: 600 }}
        >
          Device Info Client Comparison
        </a>{" "}
        canvas.
      </p>

      <FleetComparisonView clients={fleet.clients} clientIdsByCode={clientIdsByCode} />

      {comparison ? (
        <>
          <h2 className="page-title" style={{ marginTop: "2rem", fontSize: "1.35rem" }}>
            Side-by-side drill-down
          </h2>
          <p className="page-sub">Pick clients for metric-by-metric comparison and benchmarks.</p>
          <CompareClient
            clients={allClients.map((c) => ({
              id: c.id,
              name: c.name,
              country: c.country.name,
              countryCode: c.country.code,
            }))}
            initialIds={initialIds}
            comparison={comparison}
          />
        </>
      ) : null}
    </div>
  );
}
