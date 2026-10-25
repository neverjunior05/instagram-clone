import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q, POST_SELECT, VISIBLE } from "@/lib/sql";
import type { PostRow } from "@/lib/data";
import Grid from "@/components/Grid";

export const metadata = { title: "Saved", robots: { index: false } };
type Props = { searchParams: Promise<{ c?: string }> };

export default async function SavedPage({ searchParams }: Props) {
  const u = await getUser();
  if (!u) redirect("/login");
  const c = (await searchParams).c ?? null;
  const cols = await q<{ collection: string; n: number }>("SELECT collection, count(*)::int n FROM saves WHERE user_id=$1 GROUP BY 1 ORDER BY 1", [u.id]);
  // Saved posts that were later deleted or became private are filtered out by VISIBLE.
  const posts = await q<PostRow>(`${POST_SELECT} JOIN saves sv ON sv.post_id=p.id AND sv.user_id=$1 WHERE p.deleted_at IS NULL AND ${VISIBLE} AND ($2::text IS NULL OR sv.collection=$2) ORDER BY p.id DESC`, [u.id, c]);
  return (
    <div className="mx-auto max-w-[935px] p-3 md:p-6">
      <h1 className="mb-4 font-display text-2xl font-extrabold">Saved</h1>
      <p className="mb-3 text-xs text-muted">Only you can see what you&apos;ve saved.</p>
      <nav className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <Link href="/saved" className={`rounded-full border px-4 py-1.5 text-sm ${!c ? "border-violet bg-violet text-white" : "border-line"}`}>All</Link>
        {cols.map((x) => <Link key={x.collection} href={`/saved?c=${encodeURIComponent(x.collection)}`} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${c === x.collection ? "border-violet bg-violet text-white" : "border-line"}`}>{x.collection} <span className="font-mono text-xs opacity-70">{x.n}</span></Link>)}
      </nav>
      <Grid posts={posts} empty="Save posts with the bookmark icon" />
    </div>
  );
}
