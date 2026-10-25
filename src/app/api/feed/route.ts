import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getFeed } from "@/lib/data";
import { rateLimit } from "@/lib/logic";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`feed:${u.id}`, 120, 60_000)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") === "suggested" ? "suggested" : "following";
  const c = sp.get("cursor");
  const cursor = c && /^\d+$/.test(c) ? Number(c) : null;
  return NextResponse.json(await getFeed(u.id, mode, cursor), { headers: { "Cache-Control": "private, no-store" } });
}
