#!/usr/bin/env python3
"""Rebuild data/devices-inventory.json from master matrices + SUPPORT.log disk fields."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data"

SUPPORT_SOURCES = [
    ("SJM", Path("/Users/mksingh/Downloads/ITX")),
    ("SJM", Path("/Users/mksingh/Downloads/20260803/wdts-offline-collector_ITX")),
    ("Melco", Path("/Users/mksingh/Downloads/Melco/wdts-offline-collector")),
]

MATRIX_SOURCES = [
    ("SJM", Path("/Users/mksingh/Downloads/lv-master-matrix.csv")),
    ("Wynn", Path("/Users/mksingh/Downloads/Wynn/Wynn-master-matrix.csv")),
    ("GM", Path("/Users/mksingh/Downloads/Galaxy/Galaxy-master-matrix.csv")),
    ("SW", Path("/Users/mksingh/Downloads/StarWorld/SW-master-matrix.csv")),
    ("Melco", Path("/Users/mksingh/Downloads/Melco/Melco-master-matrix.csv")),
]

PCI_NVME_RE = re.compile(r"Non-Volatile memory controller \[0108\]: ([^\n]+)", re.I)
LSBLK_NVME_RE = re.compile(r"^(nvme\d+n\d+)\s+(\S+)\s+disk\b", re.I | re.M)
DF_ROOT_RE = re.compile(
    r"^(/\S+)\s+\S+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)%\s+/\s*$", re.M
)
DF_ROOT_RE2 = re.compile(r"^(/\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)%\s+/\s*$", re.M)
PCT_USED_RE = re.compile(r"percentage_used\s*[:=]\s*(\d+)", re.I)
AVAIL_SPARE_RE = re.compile(r"avail_spare\s*[:=]\s*(\d+)", re.I)
CRIT_WARN_RE = re.compile(r"critical_warning\s*[:=]\s*(0x[0-9a-fA-F]+|\d+)", re.I)
MODEL_NUMBER_RE = re.compile(r"Model Number\s*:\s*(.+)", re.I)
HOSTNAME_RE = re.compile(r'"hostname"\s*:\s*"([^"]+)"')
LABEL_RE = re.compile(r'"label"\s*:\s*"([^"]+)"')
HOSTNAME_RE2 = re.compile(r"^hostname=(.+)$", re.M)
LABEL_RE2 = re.compile(r"^label=(.+)$", re.M)


def clean_nvme_model(raw: str) -> tuple[str, str]:
    s = raw.strip()
    s = re.sub(r"\s*\[[0-9a-fA-F]{4}:[0-9a-fA-F]{4}\].*$", "", s).strip()
    s = re.sub(r"\s*\(rev [^)]+\)\s*$", "", s).strip()
    manufacturer = s.split(",")[0].split(" ")[0]
    lower = s.lower()
    for brand in [
        "Kingston",
        "Samsung",
        "Phison",
        "Silicon Motion",
        "MAXIO",
        "Hosin",
        "INNOGRIT",
        "Patriot",
        "Micron",
        "Western Digital",
        "Intel",
    ]:
        if brand.lower() in lower:
            manufacturer = brand
            break
    return manufacturer, s


def parse_support_log(path: Path, default_client: str) -> dict | None:
    try:
        text = path.read_text(errors="replace")
    except OSError:
        return None

    hostname = ""
    label = ""
    m = HOSTNAME_RE.search(text) or HOSTNAME_RE2.search(text)
    if m:
        hostname = m.group(1).strip()
    m = LABEL_RE.search(text) or LABEL_RE2.search(text)
    if m:
        label = m.group(1).strip()

    if not label or not hostname:
        fm = re.match(r"(.+?)_(\d{8}_\d{6})_SUPPORT\.log$", path.name)
        if fm:
            parts = fm.group(1).split("_")
            if len(parts) >= 2:
                if not label:
                    label = parts[-1]
                if not hostname:
                    hostname = parts[0]

    manufacturer = ""
    model = ""
    mn = MODEL_NUMBER_RE.search(text)
    if mn:
        model = mn.group(1).strip()
        manufacturer = model.split()[0]
    else:
        pci = PCI_NVME_RE.search(text)
        if pci:
            manufacturer, model = clean_nvme_model(pci.group(1))

    disk_size = ""
    ls = LSBLK_NVME_RE.search(text)
    if ls:
        disk_size = ls.group(2)

    disk_usage = ""
    for dm in DF_ROOT_RE.finditer(text):
        disk_usage = f"root {dm.group(5)}% ({dm.group(3)}/{dm.group(2)})"
    if not disk_usage:
        for dm in DF_ROOT_RE2.finditer(text):
            disk_usage = f"root {dm.group(5)}% ({dm.group(3)}/{dm.group(2)})"

    # Prefer NVMe SMART percentage_used when present; else df root % used.
    life = ""
    pct = PCT_USED_RE.search(text)
    if pct:
        life = f"{pct.group(1)}% used"
        spare = AVAIL_SPARE_RE.search(text)
        if spare:
            life += f" · spare {spare.group(1)}%"
        cw = CRIT_WARN_RE.search(text)
        if cw:
            life += f" · crit {cw.group(1)}"
    else:
        m_life = re.search(r"root\s+(\d+)%", disk_usage, re.I)
        if m_life:
            life = f"{m_life.group(1)}% used"

    if not any([manufacturer, model, disk_size, disk_usage, life]):
        return None

    return {
        "client": default_client,
        "hostname": hostname,
        "label": label,
        "disk_manufacturer": manufacturer,
        "disk_model": model,
        "disk_size": disk_size,
        "disk_usage": disk_usage,
        "disk_life": life,
    }


def load_disk_csv() -> dict[tuple[str, str], dict]:
    out: dict[tuple[str, str], dict] = {}
    p = Path("/Users/mksingh/Downloads/SJM_disk_utilization_20260806.csv")
    if not p.exists():
        return out
    with p.open(newline="", errors="replace") as f:
        for r in csv.DictReader(f):
            label = (r.get("label") or "").strip()
            host = (r.get("hostname") or "").strip()
            usage = (
                f"root {r.get('root_usepct', '')}% "
                f"({r.get('root_used', '')}/{r.get('root_size', '')})"
            )
            rec = {"disk_usage": usage}
            if label:
                out[("label", label)] = rec
            if host:
                out[("hostname", host)] = rec
    return out


def main() -> None:
    disk_by_host: dict[tuple[str, str], dict] = {}
    disk_by_label: dict[tuple[str, str], dict] = {}
    parsed = 0
    support_smart_life = 0

    for client, folder in SUPPORT_SOURCES:
        if not folder.exists():
            print("missing", folder)
            continue
        for path in folder.glob("*SUPPORT.log"):
            rec = parse_support_log(path, client)
            if not rec:
                continue
            parsed += 1
            if rec["disk_life"] and "spare" in rec["disk_life"]:
                support_smart_life += 1
            if rec["hostname"]:
                disk_by_host[(client, rec["hostname"])] = rec
                disk_by_host[("*", rec["hostname"])] = rec
            if rec["label"]:
                disk_by_label[(client, rec["label"])] = rec
                disk_by_label[("*", rec["label"])] = rec

    df_csv = load_disk_csv()
    status_by_key: dict[tuple[str, str], str] = {}
    complete = Path(
        "/Users/mksingh/Downloads/device_info_complete_list_clientwise_20260803.csv"
    )
    if complete.exists():
        with complete.open(newline="", errors="replace") as f:
            for r in csv.DictReader(f):
                client = (r.get("CLIENT") or "").strip()
                host = (r.get("HOSTNAME") or "").strip()
                ip = (r.get("IP") or "").strip()
                status = (r.get("STATUS") or "").strip()
                if host:
                    status_by_key[(client, host)] = status
                if ip:
                    status_by_key[(client, ip)] = status

    rows_out = []
    seen: set[tuple[str, str]] = set()
    counts: Counter[str] = Counter()
    disk_filled = 0
    smart_life = 0

    for default_client, path in MATRIX_SOURCES:
        if not path.exists():
            print("missing matrix", path)
            continue
        with path.open(newline="", errors="replace") as f:
            for r in csv.DictReader(f):
                raw_client = (r.get("client") or "").strip()
                if raw_client == "LV":
                    client = "LV"
                elif raw_client in ("", "Galaxy"):
                    client = default_client
                elif raw_client == "GM":
                    client = "GM"
                else:
                    client = raw_client or default_client

                label = (r.get("label") or "").strip()
                hostname = (r.get("hostname") or "").strip()
                table_name = label or hostname or (r.get("ip") or "").strip()
                ip = (r.get("ip") or "").strip()
                key = (client, ip or hostname or table_name)
                if key in seen:
                    continue
                seen.add(key)

                disk = (
                    disk_by_label.get((client, label))
                    or disk_by_host.get((client, hostname))
                    or disk_by_label.get(("*", label))
                    or disk_by_host.get(("*", hostname))
                    or {}
                )
                usage = (
                    disk.get("disk_usage")
                    or (df_csv.get(("label", label)) or {}).get("disk_usage")
                    or (df_csv.get(("hostname", hostname)) or {}).get("disk_usage")
                    or ""
                )
                manufacturer = disk.get("disk_manufacturer") or ""
                model = disk.get("disk_model") or ""
                life = disk.get("disk_life") or ""
                if usage and disk.get("disk_size"):
                    usage = f"{usage} · {disk['disk_size']}"
                elif not usage and disk.get("disk_size"):
                    usage = f"size {disk['disk_size']}"
                # disk_life = percentage used (SMART percentage_used or df root %)
                if not life and usage:
                    m_life = re.search(r"root\s+(\d+)%", usage, re.I)
                    if m_life:
                        life = f"{m_life.group(1)}% used"

                if manufacturer or model or usage or life:
                    disk_filled += 1
                if life:
                    smart_life += 1

                status = (
                    status_by_key.get((client, hostname))
                    or status_by_key.get((client, ip))
                    or (
                        "FAILED"
                        if (r.get("collection_errors") or "").strip()
                        else "OK"
                    )
                )

                rows_out.append(
                    {
                        "client": client,
                        "table_name": table_name,
                        "hostname": hostname,
                        "ip": ip,
                        "ssh_user": (r.get("ssh_user") or "").strip(),
                        "collection_utc": (r.get("collection_utc") or "").strip(),
                        "os_release": (r.get("os_release") or "").strip(),
                        "kernel": (r.get("kernel") or "").strip(),
                        "cpu_vendor": (r.get("cpu_vendor") or "").strip(),
                        "cpu_model": (r.get("cpu_model") or "").strip(),
                        "board_vendor": (r.get("board_vendor") or "").strip(),
                        "board_name": (r.get("board_name") or "").strip(),
                        "bios_vendor": (r.get("bios_vendor") or "").strip(),
                        "bios_version": (r.get("bios_version") or "").strip(),
                        "bios_date": (r.get("bios_date") or "").strip(),
                        "system_manufacturer": (
                            r.get("system_manufacturer") or ""
                        ).strip(),
                        "system_product_name": (
                            r.get("system_product_name") or ""
                        ).strip(),
                        "installed_dimm_count": (
                            r.get("installed_dimm_count") or ""
                        ).strip(),
                        "total_memory_gb": (r.get("total_memory_gb") or "").strip(),
                        "ram_manufacturers": (r.get("ram_manufacturers") or "").strip(),
                        "ram_part_numbers": (r.get("ram_part_numbers") or "").strip(),
                        "ram_speeds": (r.get("ram_speeds") or "").strip(),
                        "ram_configured_speeds": (
                            r.get("ram_configured_speeds") or ""
                        ).strip(),
                        "ram_types": (r.get("ram_types") or "").strip(),
                        "ram_ranks": (r.get("ram_ranks") or "").strip(),
                        "ram_voltages": (r.get("ram_voltages") or "").strip(),
                        "disk_usage": usage,
                        "disk_manufacturer": model or manufacturer,
                        "disk_life": life,
                        "status": status,
                    }
                )
                counts[client] += 1

    rows_out.sort(key=lambda r: (r["client"], r["table_name"], r["ip"]))
    out = {
        "generatedAt": "2026-08-08",
        "count": len(rows_out),
        "byClient": dict(counts),
        "diskCoverage": {
            "supportLogsParsed": parsed,
            "devicesWithDiskFields": disk_filled,
            "smartLifePresent": smart_life,
            "nvmeSmartPresent": support_smart_life,
            "note": (
                "disk_life = percentage used (df root %; NVMe SMART percentage_used when present); "
                "disk_manufacturer from PCI NVMe / Model Number; disk_usage from df + size"
            ),
        },
        "devices": rows_out,
    }
    out_path = ROOT / "devices-inventory.json"
    out_path.write_text(json.dumps(out, separators=(",", ":")))
    print(
        f"wrote {out_path} devices={len(rows_out)} disk_filled={disk_filled} "
        f"disk_life={smart_life} nvme_smart={support_smart_life} byClient={dict(counts)}"
    )


if __name__ == "__main__":
    main()
