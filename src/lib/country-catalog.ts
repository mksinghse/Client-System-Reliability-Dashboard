/** Suggested countries for upload / admin — not pre-seeded until data arrives. */
export const COUNTRY_CATALOG = [
  { code: "MO", name: "Macau", region: "APAC", latitude: 22.2, longitude: 113.5 },
  { code: "SG", name: "Singapore", region: "APAC", latitude: 1.35, longitude: 103.8 },
  { code: "PH", name: "Philippines", region: "APAC", latitude: 12.9, longitude: 121.8 },
  { code: "JP", name: "Japan", region: "APAC", latitude: 36.2, longitude: 138.3 },
  { code: "AU", name: "Australia", region: "APAC", latitude: -25.3, longitude: 133.8 },
  { code: "US", name: "United States", region: "Americas", latitude: 39.8, longitude: -98.5 },
  { code: "CA", name: "Canada", region: "Americas", latitude: 56.1, longitude: -106.3 },
  { code: "GB", name: "United Kingdom", region: "EMEA", latitude: 55.4, longitude: -3.4 },
  { code: "DE", name: "Germany", region: "EMEA", latitude: 51.2, longitude: 10.4 },
] as const;

export type CatalogCountry = (typeof COUNTRY_CATALOG)[number];

export function findCatalogCountry(code: string): CatalogCountry | undefined {
  const normalized = code.trim().toUpperCase();
  return COUNTRY_CATALOG.find((c) => c.code === normalized);
}
