import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  const countryId = String(body.countryId ?? "");
  const environment = String(body.environment ?? "Production");

  if (!name || !code || !countryId) {
    return NextResponse.json({ error: "name, code, and countryId are required" }, { status: 400 });
  }

  try {
    const client = await prisma.client.create({
      data: { name, code, countryId, environment },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "CLIENT_CREATE",
        entityType: "Client",
        entityId: client.id,
        details: `Created client ${code}`,
      },
    });
    return NextResponse.json({ ok: true, client });
  } catch {
    return NextResponse.json({ error: "Client code may already exist" }, { status: 400 });
  }
}
