import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { getPost } from "@/lib/data";
import { q } from "@/lib/sql";
import PostCard from "@/components/PostCard";
import Comments, { type C } from "@/components/Comments";
import OwnerTools from "@/components/OwnerTools";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const p = Number.isFinite(id) ? await getPost(0, id) : null; // only public content gets rich meta
  if (!p) return { title: "Post", robots: { index: false } };
  return { title: `${p.username} on Lumio`, description: p.caption.slice(0, 150), openGraph: { images: p.media[0].type === "image" ? [p.media[0].url] : p.media[0].poster ? [p.media[0].poster] : [] } };
}

export default async function PostPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const u = await getUser();
  const viewer = u?.id ?? 0;
  const post = await getPost(viewer, id);
  if (!post) {
    const removed = await q<{ removed_reason: string | null; user_id: number }>("SELECT removed_reason, user_id FROM posts WHERE id=$1", [id]);
    if (removed[0]?.removed_reason && removed[0].user_id === viewer) return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl font-bold">This post was removed</h1><p className="mt-2 text-muted">Reason: {removed[0].removed_reason}</p><p className="mt-4 text-sm">You can appeal by replying to your moderation notice in Settings → Data, or emailing appeals@lumio.demo.</p></div>;
    return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl font-bold">Post unavailable</h1><p className="mt-2 text-muted">It may have been deleted, or the account is private.</p></div>;
  }
  const comments = await q<C>(`SELECT c.id, c.body, c.parent_id, c.pinned, c.created_at, u.username, u.avatar FROM comments c JOIN users u ON u.id=c.user_id
    WHERE c.post_id=$1 AND u.status='active' AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.kind IN ('block','restrict') AND b.blocker_id=$2 AND b.blocked_id=u.id)
    ORDER BY c.pinned DESC, c.id ASC LIMIT 300`, [id, viewer]);
  const jsonLd = { "@context": "https://schema.org", "@type": "SocialMediaPosting", headline: post.caption.slice(0, 100), author: { "@type": "Person", name: post.username }, datePublished: post.created_at, image: post.media[0].url };
  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:p-6 lg:grid-cols-[1fr_380px]">
      {!post.username || <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <PostCard post={post} />
      <div className="px-3 md:px-0">
        {u?.id === post.user_id && <OwnerTools id={post.id} caption={post.caption} />}
        <Comments postId={post.id} initial={comments} canPin={u?.id === post.user_id} disabled={post.comments_off || !u} />
      </div>
    </div>
  );
}
