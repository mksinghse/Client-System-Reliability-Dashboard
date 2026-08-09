import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type InventoryDevice = {
  client: string;
  table_name: string;
  hostname: string;
  ip: string;
  ssh_user: string;
  collection_utc: string;
  os_release: string;
  kernel: string;
  cpu_vendor: string;
  cpu_model: string;
  board_vendor: string;
  board_name: string;
  bios_vendor: string;
  bios_version: string;
  bios_date: string;
  system_manufacturer: string;
  system_product_name: string;
  installed_dimm_count: string;
  total_memory_gb: string;
  ram_manufacturers: string;
  ram_part_numbers: string;
  ram_speeds: string;
  ram_configured_speeds: string;
  ram_types: string;
  ram_ranks: string;
  ram_voltages: string;
  disk_usage: string;
  disk_manufacturer: string;
  disk_life: string;
  status: string;
};

type InventoryFile = {
  generatedAt: string;
  count: number;
  byClient: Record<string, number>;
  diskCoverage?: {
    supportLogsParsed?: number;
    devicesWithDiskFields?: number;
    smartLifePresent?: number;
    note?: string;
  };
  devices: InventoryDevice[];
};

let cached: InventoryFile | null = null;
let cachedMtimeMs = 0;

export function loadDevicesInventory(): InventoryFile {
  const path = join(process.cwd(), "data", "devices-inventory.json");
  const mtimeMs = statSync(path).mtimeMs;
  if (cached && cachedMtimeMs === mtimeMs) return cached;
  cached = JSON.parse(readFileSync(path, "utf8")) as InventoryFile;
  cachedMtimeMs = mtimeMs;
  return cached;
}

export const DEVICE_COLUMNS: Array<{ key: keyof InventoryDevice; label: string }> = [
  { key: "client", label: "Client" },
  { key: "table_name", label: "Table" },
  { key: "ip", label: "IP" },
  { key: "ssh_user", label: "SSH user" },
  { key: "collection_utc", label: "Collection UTC" },
  { key: "os_release", label: "OS release" },
  { key: "kernel", label: "Kernel" },
  { key: "cpu_vendor", label: "CPU vendor" },
  { key: "cpu_model", label: "CPU model" },
  { key: "board_vendor", label: "Board vendor" },
  { key: "board_name", label: "Board name" },
  { key: "bios_vendor", label: "BIOS vendor" },
  { key: "bios_version", label: "BIOS version" },
  { key: "bios_date", label: "BIOS date" },
  { key: "system_manufacturer", label: "System manufacturer" },
  { key: "system_product_name", label: "System product" },
  { key: "installed_dimm_count", label: "DIMM count" },
  { key: "total_memory_gb", label: "Total memory GB" },
  { key: "ram_manufacturers", label: "RAM manufacturers" },
  { key: "ram_part_numbers", label: "RAM part numbers" },
  { key: "ram_speeds", label: "RAM speeds" },
  { key: "ram_configured_speeds", label: "RAM configured speeds" },
  { key: "ram_types", label: "RAM types" },
  { key: "ram_ranks", label: "RAM ranks" },
  { key: "ram_voltages", label: "RAM voltages" },
  { key: "disk_usage", label: "Disk usage" },
  { key: "disk_manufacturer", label: "Disk manufacturer" },
  { key: "disk_life", label: "Disk life (% used)" },
  { key: "status", label: "Status" },
];

export function queryDevices(opts: {
  client?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const inv = loadDevicesInventory();
  const client = opts.client?.trim();
  const status = opts.status?.trim().toUpperCase();
  const q = opts.q?.trim().toLowerCase();
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 10), 200);
  const page = Math.max(opts.page ?? 1, 1);

  let rows = inv.devices;
  if (client) rows = rows.filter((d) => d.client === client);
  if (status) {
    if (status === "HEALTHY" || status === "OK") rows = rows.filter((d) => d.status === "OK");
    else if (status === "CRITICAL" || status === "FAILED") rows = rows.filter((d) => d.status === "FAILED");
    else if (status === "WARNING") {
      rows = rows.filter((d) => d.status !== "OK" && d.status !== "FAILED" && d.status);
    } else if (status === "OFFLINE") {
      rows = rows.filter((d) => !d.ip || d.status === "OFFLINE");
    } else {
      rows = rows.filter((d) => d.status.toUpperCase() === status);
    }
  }
  if (q) {
    rows = rows.filter((d) =>
      [d.table_name, d.hostname, d.ip, d.client, d.board_name, d.os_release, d.cpu_model]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const devices = rows.slice(start, start + pageSize);

  return {
    devices,
    total,
    page: safePage,
    pageSize,
    totalPages,
    clients: Object.keys(inv.byClient).sort(),
    byClient: inv.byClient,
    inventoryCount: inv.count,
  };
}
