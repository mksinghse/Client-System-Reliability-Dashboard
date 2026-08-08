import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ingestCollectorUpload } from "@/lib/ingest";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const clientId = String(body.clientId ?? "");
  const fileName = String(body.fileName ?? "collector.json");
  const raw = String(body.raw ?? "");

  if (!clientId || !raw) {
    return NextResponse.json({ error: "clientId and raw payload are required" }, { status: 400 });
  }

  try {
    const upload = await ingestCollectorUpload({
      clientId,
      fileName,
      raw,
      uploadedById: session.id,
    });
    return NextResponse.json({
      ok: true,
      id: upload.id,
      status: upload.status,
      parsedTables: upload.parsedTables,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
