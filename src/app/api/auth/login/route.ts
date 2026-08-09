import { NextResponse } from "next/server";
import { store } from "@/lib/ddb/store";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await store.getUserByEmail(email);
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
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("login failed", err);
    const detail = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "Unable to sign in. Dashboard storage is unavailable.", detail },
      { status: 500 },
    );
  }
}
