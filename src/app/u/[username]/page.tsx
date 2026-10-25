import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { getProfile, type PostRow } from "@/lib/data";
import { q, POST_SELECT } from "@/lib/sql";
import Grid from "@/components/Grid";
import FollowButton from "@/components/FollowButton";
import ProfileActions from "@/components/ProfileActions";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await getProfile(0, decodeURIComponent(username));
  if (!p) return { title: "Profile", robots: { index: false } };
  return { title: `${p.name} (@${p.username})`, description: p.bio || "On Lumio", robots: p.is_private ? { index: false } : undefined, openGraph: { images: [p.avatar] } };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const username = decodeURIComponent((await params).username);
  const tab = (await searchParams).tab || "posts";
  const u = await getUser();
  const viewer = u?.id ?? 0;
  const p = await getProfile(viewer, username);
  if (!p || (p.blocked && viewer !== p.id)) notFound();
  const me = viewer === p.id;
  const canSee = !p.is_private || me || p.follow_status === "active";
  let posts: PostRow[] = [];
  if (canSee) {
    if (tab === "saved" && me) posts = await q<PostRow>(`${POST_SELECT} JOIN saves sv ON sv.post_id=p.id AND sv.user_id=$1 WHERE p.deleted_at IS NULL ORDER BY p.id DESC`, [viewer]);
    else if (tab === "tagged") posts = await q<PostRow>(`${POST_SELECT} WHERE p.deleted_at IS NULL AND p.caption ILIKE '%@' || $2 || '%' AND u.is_private=false ORDER BY p.id DESC LIMIT 60`, [viewer, p.username]);
    else posts = await q<PostRow>(`${POST_SELECT} WHERE p.user_id=$2 AND p.deleted_at IS NULL AND p.kind=$3 ORDER BY p.id DESC`, [viewer, p.id, tab === "reels" ? "reel" : "post"]);
  }
  const highlights = canSee ? await q<{ id: number; highlight: string; media_url: string }>("SELECT DISTINCT ON (highlight) id, highlight, media_url FROM stories WHERE user_id=$1 AND highlight IS NOT NULL ORDER BY highlight, id", [p.id]) : [];
  const hasStory = canSee && (await q("SELECT 1 FROM stories WHERE user_id=$1 AND expires_at>now() AND highlight IS NULL AND close_friends=false LIMIT 1", [p.id])).length > 0;
  const tabs = ["posts", "reels", ...(me ? ["saved"] : []), "tagged"];
  const jsonLd = !p.is_private && { "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: p.name, alternateName: p.username, image: p.avatar } };

  return (
    <div className="mx-auto max-w-[935px] px-3 py-6 md:px-6">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <header className="flex items-start gap-6 md:gap-16 md:px-10">
        <Link href={hasStory ? `/stories/${p.username}` : "#"} className={hasStory ? "holo-ring shrink-0" : "ring-seen shrink-0"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.avatar} alt={`${p.username}'s avatar`} className="h-20 w-20 bg-elev md:h-36 md:w-36" />
        </Link>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">{p.username}</h1>
            {p.role !== "member" && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">{p.role}</span>}
            {p.is_private && <span className="text-xs text-muted">🔒 Private</span>}
            {me ? <Link href="/settings" className="min-h-9 rounded-xl bg-elev px-4 py-2 text-sm font-semibold">Edit profile</Link> : u && <><FollowButton userId={p.id} initial={p.follow_status} /><ProfileActions userId={p.id} username={p.username} /></>}
          </div>
          <ul className="flex gap-6 text-sm"><li><b className="font-mono">{p.posts}</b> posts</li><li><b className="font-mono">{p.followers}</b> followers</li><li><b className="font-mono">{p.following}</b> following</li></ul>
          <div className="text-sm"><p className="font-semibold">{p.name}</p><p className="whitespace-pre-line text-muted">{p.bio}</p></div>
        </div>
      </header>
      {highlights.length > 0 && <div className="no-scrollbar mt-8 flex gap-5 overflow-x-auto md:px-10">{highlights.map((h) => (
        <Link key={h.id} href={`/highlights/${h.id}`} className="flex w-20 shrink-0 flex-col items-center gap-1 text-xs transition active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="ring-seen"><img src={h.media_url} alt="" className="h-16 w-16 object-cover" /></span>{h.highlight}
        </Link>))}</div>}
      <nav className="mt-8 flex justify-center gap-10 border-t border-line text-xs font-semibold uppercase tracking-widest" aria-label="Profile tabs">
        {tabs.map((t) => <Link key={t} href={`?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={`-mt-px border-t py-4 ${tab === t ? "border-fg" : "border-transparent text-muted"}`}>{t}</Link>)}
      </nav>
      {canSee ? <Grid posts={posts} empty={tab === "saved" ? "Nothing saved yet" : "No posts yet"} /> : <div className="py-20 text-center"><p className="text-lg font-bold">This account is private</p><p className="text-sm text-muted">Follow to see their photos and videos.</p></div>}
    </div>
  );
}
