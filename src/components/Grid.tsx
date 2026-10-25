import Link from "next/link";
import type { PostRow } from "@/lib/data";
import { Media } from "./PostCard";
import * as I from "./Icons";

/** Gallery grid with quiet corner indicators for carousels and videos, hover counts overlay. */
/** Request small square thumbnails from Picsum for grids (big speed win). */
const thumb = (u: string) => u.replace(/(picsum\.photos\/seed\/[^/]+)\/\d+\/\d+/, "$1/400/400");

export default function Grid({ posts, mosaic, empty = "No posts yet" }: { posts: PostRow[]; mosaic?: boolean; empty?: string }) {
  if (!posts.length) return <div className="flex flex-col items-center gap-2 py-20 text-muted"><I.Lens size={40} /><p>{empty}</p></div>;
  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1" style={mosaic ? { gridAutoFlow: "dense" } : undefined}>
      {posts.map((p, i) => {
        const m = p.media[0];
        const big = mosaic && i % 10 === 2;
        return (
          <Link key={p.id} href={p.kind === "reel" ? `/reels?start=${p.id}` : `/p/${p.id}`} className={`group relative block overflow-hidden bg-elev animate-rise ${big ? "row-span-2 aspect-[1/2]" : "aspect-square"}`} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
            <Media src={thumb(m.type === "video" ? m.poster || "" : m.url)} alt={m.alt || "Post"} filter={p.filter} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute right-2 top-2 text-white drop-shadow">{p.kind === "reel" ? <I.Film size={18} /> : p.media.length > 1 ? <I.Layers size={18} /> : null}</span>
            <span className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 font-mono text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {!p.hide_likes && <span className="flex items-center gap-1"><I.Heart filled size={18} />{p.like_count}</span>}
              <span className="flex items-center gap-1"><I.Chat filled size={18} />{p.comment_count}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
