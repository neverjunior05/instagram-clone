import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import { rateLimit } from "@/lib/logic";

export const dynamic = "force-dynamic";

/** GDPR-style export of the signed-in user's own data only. */
export async function GET() {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`export:${u.id}`, 3, 60_000)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const [posts, comments, likes, saves, following, messages] = await Promise.all([
    q("SELECT id, kind, caption, location, media, created_at FROM posts WHERE user_id=$1", [u.id]),
    q("SELECT id, post_id, body, created_at FROM comments WHERE user_id=$1", [u.id]),
    q("SELECT post_id FROM likes WHERE user_id=$1", [u.id]),
    q("SELECT post_id, collection FROM saves WHERE user_id=$1", [u.id]),
    q("SELECT u.username, f.status FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=$1", [u.id]),
    q("SELECT conversation_id, body, created_at FROM messages WHERE sender_id=$1", [u.id]),
  ]);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), profile: u, posts, comments, likes, saves, following, messages }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="lumio-${u.username}.json"`, "Cache-Control": "no-store" },
  });
}
