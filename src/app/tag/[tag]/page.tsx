import { getUser } from "@/lib/auth";
import { q, POST_SELECT, VISIBLE } from "@/lib/sql";
import type { PostRow } from "@/lib/data";
import Grid from "@/components/Grid";

type Props = { params: Promise<{ tag: string }> };
export async function generateMetadata({ params }: Props) { return { title: `#${decodeURIComponent((await params).tag)}` }; }

export default async function TagPage({ params }: Props) {
  const tag = decodeURIComponent((await params).tag).replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 30);
  const u = await getUser();
  const posts = await q<PostRow>(`${POST_SELECT} WHERE p.deleted_at IS NULL AND u.is_private=false AND ${VISIBLE} AND p.caption ~* ('#' || $2 || '\\M') ORDER BY p.id DESC LIMIT 90`, [u?.id ?? 0, tag]);
  return (
    <div className="mx-auto max-w-[935px] p-3 md:p-6">
      <h1 className="mb-1 font-display text-3xl font-extrabold">#{tag}</h1>
      <p className="mb-6 font-mono text-sm text-muted">{posts.length} posts</p>
      <Grid posts={posts} empty="No posts with this tag yet" />
    </div>
  );
}
