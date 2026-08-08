import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Unknown work account. Use a seeded WDTS user." }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, user.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
