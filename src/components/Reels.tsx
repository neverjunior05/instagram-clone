"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostRow } from "@/lib/data";
import { toggleLike, toggleSave } from "@/lib/actions";
import { Caption } from "./PostCard";
import * as I from "./Icons";

/** Snap-scrolling reels. Only the visible reel plays; neighbours preload metadata; others unload. */
export default function Reels({ reels }: { reels: PostRow[] }) {
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { setMuted(localStorage.getItem("lumio-muted") !== "0"); }, []);
  useEffect(() => {
    const els = root.current?.querySelectorAll("[data-reel]");
    if (!els) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.reel)); }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "m") toggleMute();
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); root.current?.scrollBy({ top: innerHeight, behavior: "smooth" }); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); root.current?.scrollBy({ top: -innerHeight, behavior: "smooth" }); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });
  const toggleMute = () => setMuted((m) => { localStorage.setItem("lumio-muted", m ? "0" : "1"); return !m; });

  if (!reels.length) return <p className="p-10 text-center text-muted">No reels yet.</p>;
  return (
    <div ref={root} className="no-scrollbar h-[calc(100dvh-56px-64px)] snap-y snap-mandatory overflow-y-scroll md:h-dvh">
      {reels.map((r, i) => <Reel key={r.id} r={r} i={i} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} onMute={toggleMute} />)}
    </div>
  );
}

function Reel({ r, i, active, near, muted, onMute }: { r: PostRow; i: number; active: boolean; near: boolean; muted: boolean; onMute: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [prog, setProg] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [liked, setLiked] = useState(r.liked);
  const [count, setCount] = useState(r.like_count);
  const [saved, setSaved] = useState(r.saved);
  const [burst, setBurst] = useState<{ x: number; y: number; k: number } | null>(null);
  const [glyph, setGlyph] = useState(0);
  const last = useRef(0);
  const m = r.media[0];

  useEffect(() => {
    const el = v.current; if (!el) return;
    if (active && !paused) el.play().catch(() => setPaused(true)); // autoplay blocked => show play button
    else el.pause();
  }, [active, paused]);

  const like = async (force?: boolean) => {
    const next = force ?? !liked; if (next === liked) return;
    setLiked(next); setCount((c) => c + (next ? 1 : -1));
    try { const res = await toggleLike(r.id, next); setCount(res.count); } catch { setLiked(!next); }
  };
  const tap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - last.current < 280) { const b = e.currentTarget.getBoundingClientRect(); setBurst({ x: e.clientX - b.left, y: e.clientY - b.top, k: now }); like(true); }
    else setTimeout(() => { if (Date.now() - last.current >= 280) { setPaused((p) => !p); setGlyph((g) => g + 1); } }, 300);
    last.current = now;
  };

  return (
    <section data-reel={i} aria-label={`Reel by ${r.username}`} className="relative flex h-full snap-start snap-always items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[min(100%,calc(100dvh*9/16))] overflow-hidden" onClick={tap}>
        {near && !failed ? <video ref={v} src={m.url} poster={m.poster} muted={muted} loop playsInline preload={active ? "auto" : "metadata"} onError={() => setFailed(true)}
          onTimeUpdate={(e) => setProg(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} className="h-full w-full object-cover" aria-label={m.alt} />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={m.poster} alt={m.alt || ""} className="h-full w-full object-cover" />}
        {failed && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-white">Video couldn&apos;t load — showing poster</p>}
        {glyph > 0 && <span key={glyph} className="animate-heart pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-2xl text-white">{paused ? "▶" : "❚❚"}</span>}
        {burst && <span key={burst.k} className="animate-heart pointer-events-none absolute text-white" style={{ left: burst.x - 50, top: burst.y - 50 }}><I.Heart filled size={100} /></span>}
        <div className="scrim-b absolute inset-x-0 bottom-0 p-4 pb-6 pr-20 text-white">
          <Link href={`/u/${r.username}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.avatar} alt="" className="h-8 w-8 rounded-full" />{r.username}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm"><Caption text={r.caption} /></p>
          <div className="mt-2 w-48 overflow-hidden text-xs opacity-90"><div className="flex w-max gap-8 whitespace-nowrap" style={{ animation: "marquee 8s linear infinite" }}><span>♫ {m.audio || "Original audio"}</span><span>♫ {m.audio || "Original audio"}</span></div></div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20"><div className="h-full origin-left bg-white" style={{ transform: `scaleX(${prog})` }} /></div>
        <div className="absolute bottom-6 right-2 flex flex-col items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
          <button aria-label={liked ? "Unlike" : "Like"} onClick={() => like()} className={`flex flex-col items-center p-2 ${liked ? "text-like animate-pop" : ""}`} key={String(liked)}><I.Heart filled={liked} size={28} /><span className="font-mono text-xs text-white">{r.hide_likes ? "" : count}</span></button>
          <Link aria-label="Comments" href={`/p/${r.id}`} className="flex flex-col items-center p-2"><I.Chat size={28} /><span className="font-mono text-xs">{r.comment_count}</span></Link>
          <button aria-label="Share" onClick={() => navigator.clipboard?.writeText(`${location.origin}/p/${r.id}`)} className="p-2"><I.Send size={26} /></button>
          <button aria-label={saved ? "Unsave" : "Save"} onClick={async () => { setSaved(!saved); await toggleSave(r.id).catch(() => setSaved(saved)); }} className={`p-2 ${saved ? "animate-pop" : ""}`}><I.Bookmark filled={saved} size={26} /></button>
          <button aria-label={muted ? "Unmute" : "Mute"} onClick={onMute} className="rounded-full bg-black/40 p-2"><I.Volume filled={!muted} size={22} /></button>
          <button aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused(!paused)} className="rounded-full bg-black/40 px-3 py-2 text-sm">{paused ? "▶" : "❚❚"}</button>
        </div>
      </div>
    </section>
  );
}
