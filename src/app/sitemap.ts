import type { MetadataRoute } from "next";
import { q } from "@/lib/sql";

export const dynamic = "force-dynamic";
const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Public profiles and posts only (private accounts excluded). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const users = await q<{ username: string }>("SELECT username FROM users WHERE is_private=false AND status='active'");
    const posts = await q<{ id: number }>("SELECT p.id FROM posts p JOIN users u ON u.id=p.user_id WHERE u.is_private=false AND p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500");
    return [{ url: base }, { url: `${base}/explore` }, ...users.map((u) => ({ url: `${base}/u/${u.username}` })), ...posts.map((p) => ({ url: `${base}/p/${p.id}` }))];
  } catch { return [{ url: base }]; }
}
