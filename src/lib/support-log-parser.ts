type Finding = {
  severity: "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE";
  category: string;
  title: string;
  description: string;
  recommendation?: string;
};

export type SupportTableRow = {
  tableName: string;
  tableCode: string;
  firmwareVer?: string;
  appVersion?: string;
  osInfo?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  storageUsage?: number;
  networkInfo?: string;
  serviceStatus?: string;
  peripherals: Array<{ name: string; type: string; status: string; details?: string }>;
  logs: Array<{ level: string; category: string; message: string }>;
  findings: Finding[];
};

function kv(text: string, key: string): string | undefined {
  const re = new RegExp(`(?:^|\\n)${key}=([^\\n\\r]+)`, "i");
  const m = text.match(re);
  return m?.[1]?.trim();
}

function num(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function clampPct(n: number | undefined): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function parseHostnameLabel(text: string, fileName: string): { hostname: string; label: string } {
  let hostname = kv(text, "hostname") ?? "";
  let label = kv(text, "label") ?? "";

  const jsonHost = text.match(/"hostname"\s*:\s*"([^"]+)"/);
  const jsonLabel = text.match(/"label"\s*:\s*"([^"]+)"/);
  if (!hostname && jsonHost) hostname = jsonHost[1];
  if (!label && jsonLabel) label = jsonLabel[1];

  if (!hostname || !label) {
    const base = fileName.replace(/^.*\//, "");
    const fm = base.match(/^(.+?)_(\d{8}_\d{6})_SUPPORT\.log$/i);
    if (fm) {
      const parts = fm[1].split("_");
      if (parts.length >= 2) {
        if (!label) label = parts[parts.length - 1];
        if (!hostname) hostname = parts.slice(0, -1).join("_") || parts[0];
      }
    } else if (!hostname) {
      hostname = base.replace(/\.(log|txt)$/i, "") || "unknown-host";
    }
  }

  return { hostname: hostname || "unknown-host", label: label || hostname || "unknown" };
}

function parseOs(text: string): string | undefined {
  const pretty = text.match(/PRETTY_NAME="([^"]+)"/);
  if (pretty) return pretty[1];
  return kv(text, "os") || undefined;
}

function parseRootDiskPct(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Filesystem Size Used Avail Use% Mounted on — root mount
    const m = line.match(/^\S+\s+\S+\s+\S+\s+\S+\s+(\d+)%\s+\/\s*$/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function parseMemoryUsage(fields: Record<string, string>): number | undefined {
  const total = num(fields.host_mem_total_mb);
  const avail = num(fields.host_mem_avail_mb ?? fields.mem_avail_mb);
  if (total && avail != null && total > 0) {
    return clampPct(((total - avail) / total) * 100);
  }
  const rssHost = num(fields.jvm_rss_vs_host_pct);
  if (rssHost != null) return clampPct(rssHost);
  return undefined;
}

function extractSummaryFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const jsonBlock = text.match(/----- file: SUMMARY\.json -----[\s\S]*?(\{[\s\S]*?\n\})/);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock[1]) as {
        fields?: Record<string, string>;
        hostname?: string;
      };
      if (parsed.fields) {
        for (const [k, v] of Object.entries(parsed.fields)) {
          fields[k] = String(v);
        }
      }
      if (parsed.hostname) fields.hostname = parsed.hostname;
    } catch {
      // fall through to kv parsing
    }
  }

  const summaryKeys = [
    "hostname",
    "label",
    "cpu_used_pct",
    "mem_avail_mb",
    "host_mem_total_mb",
    "host_mem_avail_mb",
    "jvm_rss_mb",
    "heap_xmx_mb",
    "jvm_rss_vs_xmx_pct",
    "jvm_rss_vs_host_pct",
    "jvm_ram_pressure",
    "bacctable",
    "bacctable_oomkilled",
    "jvm_crash_this_boot",
    "chrome_crash_this_boot",
    "gnome_crash_this_boot",
    "bios_version",
    "board_product",
    "dimm0_part",
    "dimm_count",
    "heap_flags",
    "serial_usb_status",
    "cash_counter_status",
  ];
  for (const key of summaryKeys) {
    if (!fields[key]) {
      const value = kv(text, key);
      if (value) fields[key] = value;
    }
  }
  return fields;
}

function buildFindings(fields: Record<string, string>, hostname: string): Finding[] {
  const findings: Finding[] = [];
  const pressure = (fields.jvm_ram_pressure || "").toUpperCase();
  if (pressure && pressure !== "OK") {
    findings.push({
      severity: pressure.includes("NEAR") || pressure.includes("HIGH") ? "WARNING" : "CRITICAL",
      category: "JVM / Memory",
      title: `JVM RAM pressure: ${fields.jvm_ram_pressure}`,
      description: `${hostname}: jvm_rss=${fields.jvm_rss_mb ?? "?"}MB xmx=${fields.heap_xmx_mb ?? "?"}MB (${fields.jvm_rss_vs_xmx_pct ?? "?"}%).`,
      recommendation: "Review free -m, heap flags, and NVMe SMART in SUPPORT.log before DIMM swap.",
    });
  }
  if (fields.bacctable_oomkilled === "true") {
    findings.push({
      severity: "CRITICAL",
      category: "JVM / Memory",
      title: "bacctable OOM-killed",
      description: `${hostname}: bacctable_oomkilled=true`,
      recommendation: "Capture heap dump path and host memory pressure; re-run collector soak profile.",
    });
  }
  for (const key of ["jvm_crash_this_boot", "chrome_crash_this_boot", "gnome_crash_this_boot"] as const) {
    const n = num(fields[key]) ?? 0;
    if (n > 0) {
      findings.push({
        severity: "WARNING",
        category: "Crashes",
        title: `${key}=${n}`,
        description: `${hostname}: ${key} reported ${n} this boot.`,
        recommendation: "Inspect 08_crash_corr section inside SUPPORT.log.",
      });
    }
  }
  if ((fields.bacctable || "").toLowerCase() !== "running" && fields.bacctable) {
    findings.push({
      severity: "OFFLINE",
      category: "Service",
      title: `bacctable ${fields.bacctable}`,
      description: `${hostname}: bacctable status is ${fields.bacctable}.`,
      recommendation: "Check table service status and collector runtime section.",
    });
  }
  return findings;
}

/** Convert a WDTS Offline Collector SUPPORT.log into one collector table row. */
export function parseSupportLogToTable(
  text: string,
  fileName: string,
  clientCode = "CLIENT",
): SupportTableRow {
  const { hostname, label } = parseHostnameLabel(text, fileName);
  const fields = extractSummaryFields(text);
  const osInfo = parseOs(text);
  const cpuUsage = clampPct(num(fields.cpu_used_pct));
  const memoryUsage = parseMemoryUsage(fields);
  const storageUsage = clampPct(parseRootDiskPct(text));
  const service =
    fields.bacctable?.toLowerCase() === "running"
      ? "Running"
      : fields.bacctable
        ? fields.bacctable
        : "Unknown";

  const logs: SupportTableRow["logs"] = [];
  if (fields.jvm_ram_pressure) {
    logs.push({
      level: fields.jvm_ram_pressure.toUpperCase() === "OK" ? "INFO" : "WARN",
      category: "JVM / Memory",
      message: `jvm_ram_pressure=${fields.jvm_ram_pressure}; heap=${fields.heap_flags ?? "n/a"}`,
    });
  }
  if (fields.dimm0_part) {
    logs.push({
      level: "INFO",
      category: "Memory",
      message: `dimm_count=${fields.dimm_count ?? "?"} dimm0_part=${fields.dimm0_part}`,
    });
  }

  const peripherals: SupportTableRow["peripherals"] = [];
  if (fields.serial_usb_status) {
    peripherals.push({
      name: "USB serial",
      type: "Serial",
      status: fields.serial_usb_status,
    });
  }
  if (fields.cash_counter_status) {
    peripherals.push({
      name: "Cash counter",
      type: "Peripheral",
      status: fields.cash_counter_status,
    });
  }

  const codeBase = label && label !== hostname ? `${label}-${hostname}` : hostname;
  return {
    tableName: hostname,
    tableCode: `${clientCode}-${codeBase}`.replace(/\s+/g, ""),
    firmwareVer: fields.bios_version,
    appVersion: fields.heap_flags,
    osInfo,
    cpuUsage,
    memoryUsage,
    storageUsage,
    networkInfo: fields.board_product,
    serviceStatus: service,
    peripherals,
    logs,
    findings: buildFindings(fields, hostname),
  };
}

export function isSupportLogFileName(name: string): boolean {
  const base = name.replace(/^.*\//, "").toLowerCase();
  return (
    base.endsWith("_support.log") ||
    base === "latest_for_support.txt" ||
    base.endsWith("itx_test.log") ||
    (base.endsWith(".log") && base.includes("support"))
  );
}
