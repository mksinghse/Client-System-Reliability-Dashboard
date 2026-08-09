import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSupportLogToTable } from "./support-log-parser";

const SAMPLE = `WDTS OFFLINE COLLECTOR — SUPPORT LOG
generated_at=2026-08-03T17:49:44+08:00
hostname=CL0301-025f
profile=soak
label=CL0301

----- file: SUMMARY.txt -----
load1=0.25
cpu_used_pct=2.84
mem_avail_mb=2272
host_mem_total_mb=15551
host_mem_avail_mb=2264
jvm_rss_mb=9598
heap_xmx_mb=10240
jvm_rss_vs_xmx_pct=93.7
jvm_ram_pressure=RSS_NEAR_XMX
bacctable=running
bios_version=2.02.00
board_product=W480EI-IM-A R3.0
dimm0_part=TEAMGROUP-SD4-3200
dimm_count=1
heap_flags=-Xms10240M -Xmx10240M
serial_usb_status=PRESENT

----- file: SUMMARY.json -----
{
  "hostname": "CL0301-025f",
  "fields": {
    "cpu_used_pct": "2.84",
    "host_mem_total_mb": "15551",
    "host_mem_avail_mb": "2264",
    "jvm_ram_pressure": "RSS_NEAR_XMX",
    "bacctable": "running",
    "bios_version": "2.02.00"
  }
}

$ cat /etc/os-release
PRETTY_NAME="Rocky Linux 9.6 (Blue Onyx)"

Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p3  200G   80G  120G  40% /
`;

describe("parseSupportLogToTable", () => {
  it("maps SUPPORT.log summary fields into a collector table row", () => {
    const row = parseSupportLogToTable(
      SAMPLE,
      "CL0301-025f_CL0301_20260803_174353_SUPPORT.log",
      "SJM",
    );
    assert.equal(row.tableName, "CL0301-025f");
    assert.equal(row.tableCode, "SJM-CL0301-CL0301-025f");
    assert.equal(row.osInfo, "Rocky Linux 9.6 (Blue Onyx)");
    assert.equal(row.cpuUsage, 2.8);
    assert.ok((row.memoryUsage ?? 0) > 80);
    assert.equal(row.storageUsage, 40);
    assert.equal(row.serviceStatus, "Running");
    assert.ok(row.findings.some((f) => f.category === "JVM / Memory"));
  });
});
