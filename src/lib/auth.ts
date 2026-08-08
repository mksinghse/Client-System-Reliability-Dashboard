import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "wdts_hm_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "VIEWER" | "OPERATOR" | "ADMIN";
};

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const email = jar.get(SESSION_COOKIE)?.value;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
