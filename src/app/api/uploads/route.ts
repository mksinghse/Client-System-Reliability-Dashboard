import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ingestCollectorUpload } from "@/lib/ingest";
import { resolveUploadTarget } from "@/lib/resolve-upload-target";
import { normalizeUploadPayload } from "@/lib/normalize-upload";
import { store } from "@/lib/ddb/store";

async function readUploadRequest(request: Request): Promise<{
  fileName: string;
  bytes: Buffer;
  fields: Record<string, string>;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Error("file is required");
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") fields[key] = value;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return { fileName: file.name || String(form.get("fileName") || "upload.bin"), bytes, fields };
  }

  const body = await request.json().catch(() => ({}));
  const raw = String(body.raw ?? "");
  if (!raw) throw new Error("raw payload or multipart file is required");
  return {
    fileName: String(body.fileName ?? "collector.json"),
    bytes: Buffer.from(raw, "utf8"),
    fields: {
      clientId: body.clientId != null ? String(body.clientId) : "",
      countryCode: body.countryCode != null ? String(body.countryCode) : "",
      countryName: body.countryName != null ? String(body.countryName) : "",
      region: body.region != null ? String(body.region) : "",
      clientCode: body.clientCode != null ? String(body.clientCode) : "",
      clientName: body.clientName != null ? String(body.clientName) : "",
      environment: body.environment != null ? String(body.environment) : "",
    },
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fileName, bytes, fields } = await readUploadRequest(request);

    const beforeCountry = fields.countryCode
      ? await store.getCountryByCode(fields.countryCode.toUpperCase())
      : null;
    const beforeClient = fields.clientCode
      ? await store.getClientByCode(fields.clientCode.toUpperCase())
      : fields.clientId
        ? await store.getClientById(fields.clientId)
        : null;

    const client = await resolveUploadTarget({
      clientId: fields.clientId || undefined,
      countryCode: fields.countryCode || undefined,
      countryName: fields.countryName || undefined,
      region: fields.region || undefined,
      clientCode: fields.clientCode || undefined,
      clientName: fields.clientName || undefined,
      environment: fields.environment || undefined,
    });

    const normalized = await normalizeUploadPayload({
      fileName,
      bytes,
      clientCode: client.code,
    });

    const upload = await ingestCollectorUpload({
      clientId: client.id,
      fileName: normalized.fileName,
      raw: normalized.raw,
      uploadedById: session.id,
    });

    return NextResponse.json({
      ok: true,
      id: upload.id,
      status: upload.status,
      parsedTables: upload.parsedTables,
      sourceKind: normalized.sourceKind,
      extractedFiles: normalized.extractedFiles.length,
      createdCountry: Boolean(fields.countryCode && !beforeCountry),
      createdClient: Boolean(fields.clientCode && !beforeClient),
      client: {
        id: client.id,
        name: client.name,
        code: client.code,
        country: client.country.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
