import { prisma } from "@/lib/db";
import { compareClients } from "@/lib/analytics";
import { CompareClient } from "@/components/CompareClient";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const sp = await searchParams;
  const allClients = await prisma.client.findMany({
    where: { archived: false },
    include: { country: true },
    orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
  });

  const selected = (sp.ids ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);

  const initialIds =
    selected.length >= 2
      ? selected
      : allClients.slice(0, 2).map((c) => c.id);

  const comparison = await compareClients(initialIds);

  return (
    <div>
      <h1 className="page-title">Client Comparison</h1>
      <p className="page-sub">
        Side-by-side metrics, benchmarks, and trends across clients, countries, and time.
      </p>
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
    </div>
  );
}
