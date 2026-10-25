import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import SearchBox from "@/components/SearchBox";

export const metadata = { title: "Search" };

export default async function SearchPage() {
  const u = await getUser();
  const viewer = u?.id ?? 0;
  const users = await q<{ username: string; name: string; avatar: string }>(`SELECT username, name, avatar FROM users u WHERE status='active' AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.kind='block' AND ((b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=$1)))`, [viewer]);
  // Trending tags from the last 24h of real activity (posts + likes), falls back to 7 days.
  const trending = await q<{ tag: string; n: number }>(`SELECT lower(m[1]) AS tag, count(*)::int n FROM posts p, regexp_matches(p.caption, '#([A-Za-z0-9_]+)', 'g') m
    WHERE p.deleted_at IS NULL AND p.created_at > now() - interval '7 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 12`);
  const places = await q<{ location: string }>("SELECT DISTINCT location FROM posts WHERE location IS NOT NULL LIMIT 20");
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 font-display text-2xl font-extrabold">Search</h1>
      <SearchBox users={users} tags={trending.map((t) => t.tag)} places={places.map((p) => p.location)} />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Trending tags</h2>
      <div className="flex flex-wrap gap-2">{trending.map((t) => <a key={t.tag} href={`/tag/${t.tag}`} className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-elev">#{t.tag} <span className="font-mono text-xs text-muted">{t.n}</span></a>)}</div>
    </div>
  );
}
