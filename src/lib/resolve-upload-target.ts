import { store } from "./ddb/store";
import { findCatalogCountry } from "./country-catalog";

function slugCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export async function resolveUploadTarget(input: {
  clientId?: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  clientCode?: string;
  clientName?: string;
  environment?: string;
}) {
  if (input.clientId) {
    const existing = await store.getClientById(input.clientId);
    if (!existing || existing.archived) {
      throw new Error("Selected client was not found");
    }
    return existing;
  }

  const countryCode = slugCode(input.countryCode ?? "");
  const clientCode = slugCode(input.clientCode ?? input.clientName ?? "");
  if (!countryCode) throw new Error("Country is required for a new client");
  if (!clientCode) throw new Error("Client code or name is required");

  const catalog = findCatalogCountry(countryCode);
  const countryName = (input.countryName ?? catalog?.name ?? countryCode).trim();
  const region = (input.region ?? catalog?.region ?? "APAC").trim() || "APAC";

  const country = await store.upsertCountry({
    code: countryCode,
    name: countryName,
    region,
    latitude: catalog?.latitude ?? null,
    longitude: catalog?.longitude ?? null,
  });

  const clientName = (input.clientName ?? clientCode).trim();
  const environment = (input.environment ?? "Production").trim() || "Production";

  return store.upsertClient({
    code: clientCode,
    name: clientName,
    countryId: country.id,
    environment,
    archived: false,
  });
}
