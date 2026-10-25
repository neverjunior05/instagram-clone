import crypto from "crypto";

export function hashPassword(p: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(p, salt, 32).toString("hex")}`;
}

export function verifyPassword(p: string, stored: string) {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  const c = crypto.scryptSync(p, salt, 32);
  const t = Buffer.from(h, "hex");
  return c.length === t.length && crypto.timingSafeEqual(c, t);
}
