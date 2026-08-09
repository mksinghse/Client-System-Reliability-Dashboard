import sjmItx from "../../data/sjm-itx-summary.json";
import {
  COMPARISON_CODE_BY_NAME,
  DEVICE_INFO_CLIENTS,
  type DeviceInfoClient,
} from "./device-info-comparison";

export type MetricStats = {
  n?: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
};

export type ClientItxDashboard = {
  clientCode: string;
  title: string;
  source: string;
  sharedCanvasUrl: string;
  stats: {
    supportLogs: number;
    avgLoad1: string;
    dominantHeap: string;
    board: string;
  };
  callout: string;
  motherboard: Array<[string, string, string | number]>;
  ramHeap: Array<[string, string, string | number]>;
  memoryMetrics: Array<[string, string, string, string, string, string]>;
  loadMetrics: Array<[string, string, string, string, string, string]>;
  loadBuckets: Array<[string, string, string]>;
  topLoad: Array<[string, string, string, string]>;
  runtime: Array<[string, string, string]>;
  deviceInfo?: DeviceInfoClient;
};

function fmt(n: number, digits = 2) {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.?0+$/, "");
}

function row(stats: MetricStats, label: string): [string, string, string, string, string, string] {
  return [
    label,
    fmt(stats.avg),
    fmt(stats.median),
    fmt(stats.min),
    fmt(stats.max),
    fmt(stats.p95),
  ];
}

function buildSjmDashboard(): ClientItxDashboard {
  const data = sjmItx;
  const board = data.motherboard[0]?.product ?? "W480EI";
  const primaryHeap = data.heap[0]?.flags ?? "10240M";
  const heapLabel = primaryHeap.includes("10240") ? "10240M" : primaryHeap;

  return {
    clientCode: "SJM",
    title: "SJM ITX host details",
    source: "Offline Table Diagnostic Collector SUPPORT.log summaries · 2026-08-06 · 916 hosts",
    sharedCanvasUrl:
      "https://cursor.com/dashboard/shared-canvases?shareId=canvas-by1HrCLS_HS_zNbHZBfTNARA",
    stats: {
      supportLogs: data.parsed,
      avgLoad1: fmt(data.load.load1.avg),
      dominantHeap: heapLabel,
      board: board.includes("W480") ? "W480EI" : board,
    },
    callout:
      "Hardware is uniform: ASUS W480EI-IM-A R3.0, 12 CPUs, ~15.5GB host RAM, TeamGroup 16GB SODIMM, heap 10240M. Load is generally low; JVM RSS sits near/above Xmx on most hosts (RSS_NEAR_XMX).",
    motherboard: [
      ["Board product", board, data.motherboard[0]?.count ?? data.parsed],
      [
        "Board / system mfg",
        data.system[0]?.mfg ?? "ASUSTeK COMPUTER INC.",
        data.system[0]?.count ?? data.parsed,
      ],
      [
        "System product",
        data.system[0]?.product ?? "AIOT W480EI-IM-A R3.0",
        data.system[0]?.count ?? data.parsed,
      ],
      ...data.bios.map((b, i) => [
        `BIOS ${b.version} (${b.date})`,
        i === 0 ? "Primary" : "Variant",
        b.count,
      ] as [string, string, number]),
      ["nproc", "12", data.nproc["12"] ?? data.parsed],
      ["disk_top", "nvme0n1", data.parsed],
    ],
    ramHeap: [
      ...data.dimm.map((d) => ["DIMM part", d.part, d.count] as [string, string, number]),
      ...data.heap.map((h) => ["Heap flags", h.flags, h.count] as [string, string, number]),
      ["jvm_ram_pressure", "RSS_NEAR_XMX", data.pressure.RSS_NEAR_XMX],
      ["jvm_ram_pressure", "OK", data.pressure.OK],
    ],
    memoryMetrics: [
      row(data.mem.host_mem_total_mb, "Host mem total MB"),
      row(data.mem.mem_avail_mb, "Mem avail MB"),
      row(data.mem.jvm_rss_mb, "JVM RSS MB"),
      row(data.mem.jvm_rss_vs_xmx_pct, "JVM RSS vs Xmx %"),
      row(data.mem.jvm_rss_vs_host_pct, "JVM RSS vs host %"),
      ["JVM VmSwap MB", "1629", "1854", "0", "3314", "2357"],
    ],
    loadMetrics: [
      row(data.load.load1, "load1"),
      row(data.load.load5, "load5"),
      row(data.load.load15, "load15"),
      row(data.load.load1_per_cpu, "load1 per CPU"),
      row(data.cpu.cpu_used_pct, "CPU used %"),
      row(data.cpu.cpu_iowait_pct, "CPU iowait %"),
      row(data.cpu.cpu_idle_pct, "CPU idle %"),
    ],
    loadBuckets: [
      ["< 1", String(data.load1_buckets["<1"]), "83.5%"],
      ["1 – 3", String(data.load1_buckets["1-3"]), "16.0%"],
      ["3 – 6", String(data.load1_buckets["3-6"]), "0.4%"],
      [">= 6", "0", "0%"],
    ],
    topLoad: data.top_load.map((h) => [
      h.label,
      String(h.load1),
      String(h.load1_per_cpu),
      String(h.cpu_used_pct),
    ]),
    runtime: [
      ["bacctable=running", String(data.bacctable.running), ""],
      ["bacctable=exited", String(data.bacctable.exited), "Check these hosts"],
      ["bacctable_oomkilled=false", "912", ""],
      ["serial_usb PRESENT", "822", ""],
      ["serial_usb ABSENT", "94", ""],
      ["cash_counter ABSENT_OR_NOT_ATTACHED", "916", "All hosts"],
      ["jvm_crash_this_boot > 0", "4", ""],
      ["chrome_crash_this_boot > 0", "1", ""],
      ["gnome_crash_this_boot > 0", "0", ""],
    ],
    deviceInfo: DEVICE_INFO_CLIENTS.find((c) => c.client === "SJM"),
  };
}

const DASHBOARDS: Record<string, () => ClientItxDashboard | null> = {
  SJM: buildSjmDashboard,
};

export function getClientItxDashboard(clientCode: string): ClientItxDashboard | null {
  return DASHBOARDS[clientCode]?.() ?? null;
}

export function getDeviceInfoForClientCode(clientCode: string): DeviceInfoClient | undefined {
  const short = Object.entries(COMPARISON_CODE_BY_NAME).find(([, code]) => code === clientCode)?.[0];
  return short ? DEVICE_INFO_CLIENTS.find((c) => c.client === short) : undefined;
}
