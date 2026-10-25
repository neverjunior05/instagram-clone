import { cookies } from "next/headers";
import crypto from "crypto";
import { q } from "./sql";

const SECRET = process.env.AUTH_SECRET || "lumio-dev-secret-change-me";
const COOKIE = "lumio_session";

export type SessionUser = { id: number; username: string; name: string; avatar: string; role: string; is_private: boolean; bio: string; email: string };

const sign = (v: string) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");

export async function setSession(id: number) {
  const v = `${id}.${Date.now()}`;
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.COOKIE_SECURE === "1" });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const v = `${parts[0]}.${parts[1]}`;
  const expected = sign(v);
  if (expected.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return null;
  const rows = await q<SessionUser>("SELECT id, username, name, avatar, role, is_private, bio, email FROM users WHERE id=$1 AND status <> 'suspended'", [Number(parts[0])]);
  return rows[0] ?? null;
}

export async function requireUser() {
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  return u;
}
