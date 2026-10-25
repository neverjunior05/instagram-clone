"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PostRow } from "@/lib/data";
import PostCard from "./PostCard";
import { RANKING_EXPLAINER } from "@/lib/logic";

type Mode = "following" | "suggested";

export default function Feed() {
  const [mode, setMode] = useState<Mode>("following");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [next, setNext] = useState<number | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fresh, setFresh] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (m: Mode, cursor: number | null, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true; setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/feed?mode=${m}${cursor != null ? `&cursor=${cursor}` : ""}`);
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { posts: PostRow[]; next: number | null };
      setPosts((p) => (reset ? j.posts : [...p, ...j.posts.filter((x) => !p.some((y) => y.id === x.id))]));
      setNext(j.next);
    } catch { setError(true); } finally { loadingRef.current = false; setLoading(false); }
  }, []);

  useEffect(() => { setPosts([]); setNext(undefined); load(mode, null, true); }, [mode, load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && next) load(mode, next); }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, mode, load]);

  // Poll for newer posts every 30s and show the "New posts" pill (no auto-jump).
  useEffect(() => {
    if (mode !== "following") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/feed?mode=following`).then((x) => x.json()).catch(() => null);
      const top = posts[0]?.id ?? 0;
      if (r?.posts) setFresh(r.posts.filter((p: PostRow) => p.id > top).length);
    }, 30000);
    return () => clearInterval(t);
  }, [mode, posts]);

  // J/K navigation between posts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || !["j", "k"].includes(e.key)) return;
      const items = [...document.querySelectorAll<HTMLElement>("[data-post]")];
      const cur = items.findIndex((x) => x.getBoundingClientRect().top > 10);
      const target = items[Math.max(0, Math.min(items.length - 1, e.key === "j" ? cur + (cur >= 0 ? 0 : 1) + (items[cur]?.getBoundingClientRect().top < 80 ? 1 : 0) : cur - 1))];
      target?.scrollIntoView({ behavior: "smooth", block: "start" }); target?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section aria-label="Feed">
      <div role="tablist" className="relative mx-3 mb-2 grid grid-cols-2 rounded-full border border-line p-1 text-sm md:mx-0">
        <span aria-hidden className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-elev transition-transform duration-300" style={{ transform: `translateX(${mode === "following" ? 4 : "calc(100% + 4px)"})` }} />
        {(["following", "suggested"] as Mode[]).map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="relative z-10 min-h-9 rounded-full capitalize">{m}</button>)}
      </div>
      <p className="mx-3 mb-3 text-xs text-muted md:mx-0">{mode === "following" ? "Newest first from accounts you follow. No ranking." : RANKING_EXPLAINER}</p>

      {fresh > 0 && <button onClick={() => { setFresh(0); window.scrollTo({ top: 0, behavior: "smooth" }); load(mode, null, true); }} className="fixed left-1/2 top-20 z-30 rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white shadow-lg" style={{ animation: "bounceIn .5s ease both" }}>↑ New posts</button>}
      <div aria-live="polite" className="sr-only">{fresh > 0 ? `${fresh} new posts available` : ""}</div>

      <div className="space-y-2 md:space-y-6">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      {loading && <div className="space-y-6 py-4">{[0, 1].map((i) => <div key={i} className="space-y-3"><div className="flex items-center gap-3 px-3"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-3 w-32 rounded" /></div><div className="skeleton aspect-[4/5] w-full rounded-[6px]" /></div>)}</div>}
      {error && <div className="p-6 text-center text-sm text-muted">Couldn&apos;t load posts. <button onClick={() => load(mode, posts.at(-1)?.id ?? null)} className="text-vtext underline">Retry</button></div>}
      {!loading && next === null && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stopColor="#7CF7E4" /><stop offset=".35" stopColor="#8B7BFF" /><stop offset=".7" stopColor="#FF6BD6" /><stop offset="1" stopColor="#FFD36B" /></linearGradient></defs><circle cx="28" cy="28" r="25" fill="none" stroke="url(#hg)" strokeWidth="2" /><path d="M17 29l7 7 15-16" fill="none" stroke="url(#hg)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="40" style={{ animation: "draw .8s .2s ease forwards" }} /></svg>
          <p className="font-display text-lg font-bold">You&apos;re all caught up</p>
          <p className="text-sm text-muted">{posts.length ? "You've seen every new post." : "Follow some accounts to fill your feed."}</p>
          {mode === "following" && <button onClick={() => setMode("suggested")} className="text-sm font-semibold text-vtext">See suggested posts</button>}
        </div>
      )}
      <div ref={sentinel} />
    </section>
  );
}
