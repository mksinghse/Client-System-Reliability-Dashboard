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
  const region = String(body.region ?? "EMEA");
  const latitude = Number(body.latitude ?? 0);
  const longitude = Number(body.longitude ?? 0);

  if (!name || !code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 });
  }

  try {
    const country = await prisma.country.create({
      data: { name, code, region, latitude, longitude },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "COUNTRY_CREATE",
        entityType: "Country",
        entityId: country.id,
        details: `Created country ${code}`,
      },
    });
    return NextResponse.json({ ok: true, country });
  } catch {
    return NextResponse.json({ error: "Country code may already exist" }, { status: 400 });
  }
}
