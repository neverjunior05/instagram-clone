"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { PostRow } from "@/lib/data";
import { toggleLike, toggleSave, report, toggleRelation } from "@/lib/actions";
import { filterCss, parseCaption, timeAgo } from "@/lib/logic";
import * as I from "./Icons";

export function Caption({ text }: { text: string }) {
  return <>{parseCaption(text).map((t, i) => t.t === "text" ? <span key={i}>{t.v}</span> : t.t === "tag"
    ? <Link key={i} href={`/tag/${encodeURIComponent(t.v.toLowerCase())}`} className="text-sky hover:underline">#{t.v}</Link>
    : <Link key={i} href={`/u/${t.v}`} className="text-sky hover:underline">@{t.v}</Link>)}</>;
}

/** Image that blurs up and falls back to a dark gradient lens card if broken. */
export function Media({ src, alt, filter, className = "" }: { src: string; alt: string; filter?: string; className?: string }) {
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  if (state === "err") return <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-elev to-bg text-muted ${className}`}><I.Lens size={36} /></div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setState("ok")} onError={() => setState("err")}
      style={{ filter: filterCss(filter) }} className={`object-cover transition duration-700 ${state === "load" ? "scale-105 blur-xl" : ""} ${className}`} />
  );
}

export default function PostCard({ post, onComment }: { post: PostRow; onComment?: () => void }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.like_count);
  const [saved, setSaved] = useState(post.saved);
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(0);
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [, start] = useTransition();
  const lastTap = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  // Optimistic like; server is idempotent so rapid taps never double count.
  const like = (force?: boolean) => {
    const next = force ?? !liked;
    if (next === liked) return;
    setLiked(next); setCount((c) => c + (next ? 1 : -1));
    start(async () => {
      try { const r = await toggleLike(post.id, next); setLiked(r.liked); setCount(r.count); }
      catch { setLiked(!next); setCount((c) => c + (next ? -1 : 1)); setMsg("Couldn't update like"); }
    });
  };
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { like(true); setBurst((b) => b + 1); }
    lastTap.current = now;
  };
  const save = () => { setSaved((s) => !s); start(async () => { try { const r = await toggleSave(post.id); setSaved(r.saved); } catch { setSaved(saved); } }); };
  const go = (d: number) => { const el = scroller.current; if (el) el.scrollTo({ left: el.clientWidth * (idx + d), behavior: "smooth" }); };

  return (
    <article data-post={post.id} tabIndex={-1} className="animate-rise border-b border-line pb-4 outline-none md:border-none"
      onKeyDown={(e) => { if (e.key === "l") like(); if (e.key === "s") save(); if (e.key === "c") onComment?.(); }}>
      <header className="flex items-center gap-3 px-3 py-3 md:px-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href={`/u/${post.username}`}><img src={post.avatar} alt="" className="h-8 w-8 rounded-full bg-elev" /></Link>
        <div className="min-w-0 flex-1 text-sm leading-tight">
          <Link href={`/u/${post.username}`} className="font-semibold">{post.username}</Link>
          <span suppressHydrationWarning className="font-mono text-xs text-muted"> · {timeAgo(post.created_at)}</span>
          {post.location && <div className="truncate text-xs text-muted">{post.location}</div>}
        </div>
        <div className="relative">
          <button aria-label="Post options" aria-expanded={menu} onClick={() => setMenu(!menu)} className="p-2.5 text-muted hover:text-fg"><I.Dots /></button>
          {menu && (
            <div className="absolute right-0 z-20 w-48 overflow-hidden rounded-[14px] border border-line bg-elev text-sm shadow-xl">
              <Link href={`/p/${post.id}`} className="block px-4 py-3 hover:bg-line">Go to post</Link>
              <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/p/${post.id}`); setMsg("Link copied"); setMenu(false); }}>Copy link</button>
              <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={async () => { await toggleRelation(post.user_id, "mute").catch(() => null); setMsg(`Muted posts from ${post.username}`); setMenu(false); }}>Mute posts</button>
              <button className="block w-full px-4 py-3 text-left text-like hover:bg-line" onClick={async () => { const r = prompt("Why are you reporting this? (Spam, Harassment, Nudity, Violence, Other)"); if (r) { await report(post.kind, post.id, r); setMsg("Thanks — our moderators will review it."); } setMenu(false); }}>Report</button>
            </div>
          )}
        </div>
      </header>

      <div className="relative overflow-hidden bg-elev md:rounded-[6px]" onClick={onTap} onDoubleClick={(e) => e.preventDefault()}>
        <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {post.media.map((m, i) => (
            <div key={i} className="aspect-[4/5] w-full shrink-0 snap-center">
              {m.type === "video"
                ? <video src={m.url} poster={m.poster} muted loop playsInline controls preload="none" className="h-full w-full object-cover" aria-label={m.alt} />
                : <Media src={m.url} alt={m.alt || "Photo"} filter={post.filter} className="h-full w-full" />}
            </div>
          ))}
        </div>
        {burst > 0 && <div key={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-white"><I.Heart filled size={110} className="animate-heart drop-shadow-2xl" /></div>}
        {post.media.length > 1 && <>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-xs text-white">{idx + 1}/{post.media.length}</span>
          {idx > 0 && <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-white/80 text-black md:block">‹</button>}
          {idx < post.media.length - 1 && <button aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-white/80 text-black md:block">›</button>}
        </>}
      </div>
      {post.media.length > 1 && <div className="mt-2 flex justify-center gap-1">{post.media.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-violet" : "w-1.5 bg-line"}`} />)}</div>}

      <div className="flex items-center gap-1 px-1.5 pt-1 md:px-0">
        <button aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked} onClick={() => like()} className={`p-2.5 ${liked ? "animate-pop text-like" : "hover:text-muted"}`} key={String(liked)}><I.Heart filled={liked} /></button>
        <Link aria-label="Comments" href={`/p/${post.id}`} className="p-2.5 hover:text-muted"><I.Chat /></Link>
        <button aria-label="Share" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/p/${post.id}`); setMsg("Link copied to share"); }} className="p-2.5 hover:text-muted"><I.Send /></button>
        <button aria-label={saved ? "Remove from saved" : "Save"} aria-pressed={saved} onClick={save} key={`s${saved}`} className={`ml-auto p-2.5 ${saved ? "animate-pop text-vtext" : ""}`}><I.Bookmark filled={saved} /></button>
      </div>
      <div className="space-y-1 px-3 text-[15px] leading-normal md:px-0">
        {!post.hide_likes ? <p className="font-mono text-sm font-semibold">{count.toLocaleString()} {count === 1 ? "like" : "likes"}</p> : <p className="text-sm text-muted">Like count hidden by author</p>}
        {post.caption && <p className={`break-words ${expanded ? "" : "line-clamp-2"}`}><Link href={`/u/${post.username}`} className="mr-1.5 font-semibold">{post.username}</Link><Caption text={post.caption} /></p>}
        {post.caption.length > 90 && !expanded && <button onClick={() => setExpanded(true)} className="text-sm text-muted">more</button>}
        {post.comments_off ? <p className="text-sm text-muted">Comments are off</p> : post.comment_count > 0 && <Link href={`/p/${post.id}`} className="block text-sm text-muted">View all {post.comment_count} comments</Link>}
        {msg && <p role="status" className="text-sm text-mint">{msg}</p>}
      </div>
    </article>
  );
}
