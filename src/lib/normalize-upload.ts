import JSZip from "jszip";
import { collectorPayloadSchema } from "./collector-parser";
import { isSupportLogFileName, parseSupportLogToTable } from "./support-log-parser";

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const MAX_ENTRIES = 2500;
const MAX_UNCOMPRESSED = 200 * 1024 * 1024;

export type NormalizedUpload = {
  fileName: string;
  raw: string;
  sourceKind: "collector-json" | "support-log" | "zip";
  extractedFiles: string[];
  tableCount: number;
};

function looksLikeCollectorJson(text: string): boolean {
  try {
    const json = JSON.parse(text) as unknown;
    return collectorPayloadSchema.safeParse(json).success;
  } catch {
    return false;
  }
}

function buildCollectorRaw(
  tables: unknown[],
  clientCode: string,
  collectedAt?: string,
): string {
  return JSON.stringify({
    collectorVersion: "support-log-ingest",
    collectedAt: collectedAt ?? new Date().toISOString(),
    clientCode,
    environment: "Production",
    tables,
  });
}

function safeZipPath(name: string): boolean {
  if (!name || name.endsWith("/")) return false;
  const normalized = name.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  if (normalized.includes("__MACOSX/") || normalized.endsWith(".DS_Store")) return false;
  return true;
}

async function extractZipEntries(
  buffer: Buffer,
): Promise<Array<{ name: string; text: string }>> {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error(`ZIP exceeds ${MAX_ZIP_BYTES / (1024 * 1024)}MB limit`);
  }
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((n) => safeZipPath(n) && !zip.files[n].dir);
  if (names.length > MAX_ENTRIES) {
    throw new Error(`ZIP has too many files (${names.length}; max ${MAX_ENTRIES})`);
  }

  let total = 0;
  const out: Array<{ name: string; text: string }> = [];
  for (const name of names) {
    const entry = zip.files[name];
    const text = await entry.async("string");
    total += Buffer.byteLength(text, "utf8");
    if (total > MAX_UNCOMPRESSED) {
      throw new Error("ZIP uncompressed content exceeds safety limit");
    }
    out.push({ name, text });
  }
  return out;
}

/** Turn JSON / SUPPORT.log / ZIP bytes into collector JSON for ingest. */
export async function normalizeUploadPayload(opts: {
  fileName: string;
  bytes: Buffer;
  clientCode?: string;
}): Promise<NormalizedUpload> {
  const fileName = opts.fileName || "upload.bin";
  const lower = fileName.toLowerCase();
  const clientCode = (opts.clientCode || "CLIENT").toUpperCase();

  if (lower.endsWith(".zip")) {
    const entries = await extractZipEntries(opts.bytes);
    const extractedFiles = entries.map((e) => e.name);

    const collectorJsons = entries.filter(
      (e) => e.name.toLowerCase().endsWith(".json") && looksLikeCollectorJson(e.text),
    );
    if (collectorJsons.length === 1) {
      const parsed = JSON.parse(collectorJsons[0].text) as { tables: unknown[] };
      return {
        fileName,
        raw: collectorJsons[0].text,
        sourceKind: "zip",
        extractedFiles,
        tableCount: parsed.tables.length,
      };
    }
    if (collectorJsons.length > 1) {
      const tables = collectorJsons.flatMap((file) => {
        const parsed = JSON.parse(file.text) as { tables: unknown[] };
        return parsed.tables;
      });
      const raw = buildCollectorRaw(tables, clientCode);
      return {
        fileName,
        raw,
        sourceKind: "zip",
        extractedFiles,
        tableCount: tables.length,
      };
    }

    const supportFiles = entries.filter((e) => isSupportLogFileName(e.name));
    if (!supportFiles.length) {
      throw new Error(
        "ZIP contained no collector JSON or SUPPORT.log files (*_SUPPORT.log / LATEST_FOR_SUPPORT.txt)",
      );
    }

    const tables = supportFiles.map((f) => parseSupportLogToTable(f.text, f.name, clientCode));
    // De-dupe by tableCode (keep last)
    const byCode = new Map(tables.map((t) => [t.tableCode, t]));
    const unique = Array.from(byCode.values());
    const raw = buildCollectorRaw(unique, clientCode);
    return {
      fileName,
      raw,
      sourceKind: "zip",
      extractedFiles,
      tableCount: unique.length,
    };
  }

  const text = opts.bytes.toString("utf8");

  if (lower.endsWith(".json") || looksLikeCollectorJson(text)) {
    if (!looksLikeCollectorJson(text)) {
      throw new Error("JSON file is not a valid collector payload (missing tables[])");
    }
    const parsed = JSON.parse(text) as { tables: unknown[] };
    return {
      fileName,
      raw: text,
      sourceKind: "collector-json",
      extractedFiles: [fileName],
      tableCount: parsed.tables.length,
    };
  }

  if (isSupportLogFileName(fileName) || text.includes("WDTS OFFLINE COLLECTOR") || text.includes("hostname=")) {
    const table = parseSupportLogToTable(text, fileName, clientCode);
    const raw = buildCollectorRaw([table], clientCode);
    return {
      fileName,
      raw,
      sourceKind: "support-log",
      extractedFiles: [fileName],
      tableCount: 1,
    };
  }

  throw new Error("Unsupported file type. Upload .zip, collector .json, or *_SUPPORT.log");
}
