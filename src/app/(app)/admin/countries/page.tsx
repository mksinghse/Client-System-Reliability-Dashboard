import { prisma } from "@/lib/db";
import { CountryAdminForm } from "@/components/CountryAdminForm";

export default async function AdminCountriesPage() {
  const countries = await prisma.country.findMany({
    include: { _count: { select: { clients: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Country Management</h1>
      <p className="page-sub">Maintain the country → clients hierarchy used across dashboards.</p>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Add Country</h2>
            <CountryAdminForm />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Countries</h2>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Region</th>
                  <th>Clients</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>{c.region}</td>
                    <td>{c._count.clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
