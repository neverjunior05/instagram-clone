import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";

export const dynamic = "force-dynamic";
// In-memory typing state: conversationId -> userId -> timestamp (single-instance demo).
const typing = new Map<number, Map<number, number>>();

async function member(cid: number, uid: number) {
  return (await q("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2", [cid, uid])).length > 0;
}

/** Long-poll-lite: returns messages after `after`, marks them seen, cleans vanish-mode messages, returns typing + receipts. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  const cid = Number((await ctx.params).id);
  if (!u || !Number.isInteger(cid) || !(await member(cid, u.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const after = Number(new URL(req.url).searchParams.get("after") || 0);
  const conv = await q<{ vanish: boolean }>("SELECT vanish FROM conversations WHERE id=$1", [cid]);
  // Vanish mode: messages seen by the recipient more than 15s ago disappear (worker also cleans offline cases).
  if (conv[0]?.vanish) await q("DELETE FROM messages WHERE conversation_id=$1 AND seen_at < now() - interval '15 seconds'", [cid]);
  await q("UPDATE messages SET seen_at=now() WHERE conversation_id=$1 AND sender_id<>$2 AND seen_at IS NULL", [cid, u.id]);
  await q("UPDATE conversation_members SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2", [cid, u.id]);
  const msgs = await q("SELECT m.id, m.sender_id, m.body, m.created_at, m.seen_at, u.username, u.avatar FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=$1 AND m.id > $2 ORDER BY m.id LIMIT 200", [cid, after]);
  const ids = await q<{ id: number }>("SELECT id FROM messages WHERE conversation_id=$1", [cid]);
  const t = typing.get(cid);
  const typers = t ? [...t.entries()].filter(([id, ts]) => id !== u.id && Date.now() - ts < 4000).map(([id]) => id) : [];
  return NextResponse.json({ messages: msgs, alive: ids.map((x) => x.id), typing: typers, vanish: !!conv[0]?.vanish }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  const cid = Number((await ctx.params).id);
  if (!u || !(await member(cid, u.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!typing.has(cid)) typing.set(cid, new Map());
  typing.get(cid)!.set(u.id, Date.now());
  return NextResponse.json({ ok: true });
}
