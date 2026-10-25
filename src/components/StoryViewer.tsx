"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { replyToStory, saveHighlight } from "@/lib/actions";
import { timeAgo } from "@/lib/logic";

type S = { id: number; media_url: string; text: string | null; close_friends: boolean; created_at: string };
const DURATION = 5000;

/** Full-screen story viewer: tap left/right to navigate, hold to pause, swipe down to close. */
export default function StoryViewer({ stories, username, avatar, ownerId, isOwner, nextHref }: { stories: S[]; username: string; avatar: string; ownerId: number; isOwner: boolean; nextHref: string | null }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState("");
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const holdT = useRef<number>(0);

  const close = () => router.push("/home");
  const next = () => { if (i < stories.length - 1) { setI(i + 1); setElapsed(0); } else if (nextHref) router.push(nextHref); else close(); };
  const prev = () => { if (i > 0) { setI(i - 1); setElapsed(0); } };

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((e) => e + 50), 50);
    return () => clearInterval(t);
  });
  useEffect(() => { if (elapsed >= DURATION) next(); }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); if (e.key === "Escape") close(); if (e.key === " ") setPaused((p) => !p); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });

  if (!stories.length) return <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-black text-white"><p>This story has expired or isn&apos;t available.</p><Link href="/home" className="text-violet-bright">Back home</Link></div>;
  const s = stories[i];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black" style={{ transform: `translateY(${dragY}px) scale(${1 - dragY / 2000})`, opacity: 1 - dragY / 600 }}>
      <div className="relative h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden md:rounded-xl"
        onPointerDown={(e) => { startY.current = e.clientY; holdT.current = window.setTimeout(() => setPaused(true), 180); }}
        onPointerMove={(e) => { if (startY.current != null) setDragY(Math.max(0, e.clientY - startY.current)); }}
        onPointerUp={(e) => {
          clearTimeout(holdT.current);
          const wasHold = paused; setPaused(false);
          if (dragY > 120) return close();
          setDragY(0); startY.current = null;
          if (wasHold) return;
          const b = e.currentTarget.getBoundingClientRect();
          if ((e.target as HTMLElement).closest("form,button,a")) return;
          if (e.clientX - b.left < b.width / 3) prev(); else next();
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={s.id} src={s.media_url} alt={s.text || `Story by ${username}`} className={`animate-rise h-full w-full object-cover transition ${paused ? "brightness-75" : ""}`} />
        <div className="scrim-t absolute inset-x-0 top-0 p-3">
          <div className="flex gap-1" aria-hidden>{stories.map((_, k) => <div key={k} className="h-0.5 flex-1 overflow-hidden rounded bg-white/30"><div className="h-full origin-left bg-white" style={{ transform: `scaleX(${k < i ? 1 : k === i ? Math.min(1, elapsed / DURATION) : 0})` }} /></div>)}</div>
          <div className="mt-3 flex items-center gap-2 text-sm text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="" className="h-8 w-8 rounded-full" /><b>{username}</b><span suppressHydrationWarning className="font-mono text-xs opacity-80">{timeAgo(s.created_at)}</span>
            {s.close_friends && <span className="rounded-full bg-mint px-2 text-xs font-semibold text-black">Close friends</span>}
            <button aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused(!paused)} className="ml-auto p-2">{paused ? "▶" : "❚❚"}</button>
            <button aria-label="Close" onClick={close} className="p-2 text-xl">✕</button>
          </div>
        </div>
        {s.text && <p className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-xl bg-black/60 px-4 py-2 text-center text-xl font-bold text-white" style={{ animation: "pop .5s ease" }}>{s.text}</p>}
        <div className="absolute inset-x-0 bottom-0 p-3 pb-safe">
          {isOwner ? (
            <button onClick={async () => { const n = prompt("Highlight name?"); if (n) { await saveHighlight(s.id, n); setSent("Added to highlights"); } }} className="rounded-full border border-white/50 px-4 py-2 text-sm text-white">+ Add to highlight</button>
          ) : (
            <form onSubmit={async (e) => { e.preventDefault(); if (!reply.trim()) return; await replyToStory(ownerId, reply).then(() => setSent("Sent to DMs")).catch((er) => setSent(er.message)); setReply(""); }} className="flex gap-2">
              <input value={reply} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${username}…`} aria-label="Reply to story" className="flex-1 rounded-full border border-white/40 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/70" />
              <button className="px-3 text-sm font-semibold text-white">Send</button>
            </form>
          )}
          {sent && <p role="status" className="mt-2 text-center text-sm text-white">{sent}</p>}
        </div>
      </div>
    </div>
  );
}
