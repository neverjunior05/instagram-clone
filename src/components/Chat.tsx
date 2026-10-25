"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage, setVanish, unsendMessage, report, toggleRelation } from "@/lib/actions";
import { timeAgo } from "@/lib/logic";

type M = { id: number; sender_id: number; body: string; created_at: string; seen_at: string | null; username: string; avatar: string; status?: "sending" | "failed"; tmp?: string; reaction?: string };
type Member = { id: number; username: string; avatar: string; last_read_at: string | null };

/** Chat with 1.5s polling (SSE/Socket.IO swap-in point), optimistic sends with retry queue, typing, receipts, vanish mode. */
export default function Chat({ id, me, title, members, initialVanish }: { id: number; me: number; title: string; members: Member[]; initialVanish: boolean }) {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState<number[]>([]);
  const [vanish, setV] = useState(initialVanish);
  const [err, setErr] = useState("");
  const lastId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef(0);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/messages/${id}?after=${lastId.current}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { messages: M[]; alive: number[]; typing: number[]; vanish: boolean };
      setTyping(j.typing); setV(j.vanish);
      setMsgs((cur) => {
        const alive = new Set(j.alive);
        const kept = cur.filter((m) => m.tmp || alive.has(m.id));
        const fresh = j.messages.filter((m) => !kept.some((k) => k.id === m.id));
        if (j.messages.length) lastId.current = Math.max(lastId.current, ...j.messages.map((m) => m.id));
        return [...kept, ...fresh];
      });
    } catch { /* offline: keep polling */ }
  }, [id]);

  useEffect(() => { poll(); const t = setInterval(poll, 1500); return () => clearInterval(t); }, [poll]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const deliver = async (m: M) => {
    try {
      const saved = (await sendMessage(id, m.body)) as M;
      setMsgs((c) => c.map((x) => (x.tmp === m.tmp ? { ...x, ...saved, tmp: undefined, status: undefined } : x)));
      lastId.current = Math.max(lastId.current, saved.id);
    } catch (e) {
      setErr((e as Error).message);
      setMsgs((c) => c.map((x) => (x.tmp === m.tmp ? { ...x, status: "failed" } : x)));
    }
  };
  const send = () => {
    const body = text.trim(); if (!body) return;
    const m: M = { id: -Date.now(), tmp: String(Date.now()), sender_id: me, body, created_at: new Date().toISOString(), seen_at: null, username: "", avatar: "", status: "sending" };
    setMsgs((c) => [...c, m]); setText(""); setErr("");
    deliver(m);
  };
  const lastMine = [...msgs].reverse().find((m) => m.sender_id === me && !m.tmp);

  return (
    <div className={`mx-auto flex h-[calc(100dvh-56px-64px)] max-w-2xl flex-col md:h-dvh ${vanish ? "bg-[radial-gradient(circle_at_20%_30%,rgba(139,123,255,.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,107,214,.1),transparent_40%)]" : ""}`}>
      <header className="flex items-center gap-3 border-b border-line p-3">
        <Link href="/messages" aria-label="Back" className="p-2">‹</Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {members[0] && <img src={members[0].avatar} alt="" className="h-9 w-9 rounded-full bg-elev" />}
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{title}</p>{vanish && <p className="text-xs text-vtext">Vanish mode — seen messages disappear</p>}</div>
        <button onClick={async () => { await setVanish(id, !vanish); setV(!vanish); }} className="rounded-full border border-line px-3 py-1 text-xs">{vanish ? "Turn off vanish" : "Vanish mode"}</button>
        {members.length === 1 && <button onClick={async () => { if (confirm(`Block ${members[0].username}?`)) { await toggleRelation(members[0].id, "block"); setErr("Blocked. You can no longer message each other."); } }} className="text-xs text-like">Block</button>}
      </header>
      <ol className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
        {msgs.length === 0 && <li className="py-10 text-center text-sm text-muted">Say hi 👋</li>}
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <li key={m.tmp ?? m.id} className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`} style={{ animation: "rise .3s cubic-bezier(.2,.8,.2,1) both", transformOrigin: mine ? "right" : "left" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {!mine && <img src={m.avatar} alt="" className="h-6 w-6 rounded-full bg-elev" />}
              <div className="relative max-w-[75%]">
                <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[15px] ${mine ? "bg-violet text-white" : "bg-elev"} ${m.status === "sending" ? "opacity-60" : ""}`}>{m.body}</p>
                {m.reaction && <span className="absolute -bottom-3 right-2 animate-pop rounded-full bg-surface px-1 text-sm">{m.reaction}</span>}
                <div className={`mt-0.5 hidden gap-2 text-xs text-muted group-hover:flex ${mine ? "justify-end" : ""}`}>
                  <span suppressHydrationWarning className="font-mono">{timeAgo(m.created_at)}</span>
                  {["❤️", "😂", "🔥"].map((r) => <button key={r} aria-label={`React ${r}`} onClick={() => setMsgs((c) => c.map((x) => x.id === m.id ? { ...x, reaction: x.reaction === r ? undefined : r } : x))}>{r}</button>)}
                  {mine && !m.tmp && <button onClick={async () => { await unsendMessage(m.id); setMsgs((c) => c.filter((x) => x.id !== m.id)); }}>Unsend</button>}
                  {!mine && <button onClick={() => report("message", m.id, "Reported from chat").then(() => setErr("Message reported"))}>Report</button>}
                </div>
                {m.status === "failed" && <button onClick={() => { setMsgs((c) => c.map((x) => x.tmp === m.tmp ? { ...x, status: "sending" } : x)); deliver(m); }} className="text-xs text-like">Not sent · Tap to retry</button>}
              </div>
            </li>
          );
        })}
        {lastMine?.seen_at && <li className="text-right text-xs text-muted">Seen</li>}
        {typing.length > 0 && <li className="flex gap-1 p-2" aria-label="Typing">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-muted" style={{ animation: `dots 1s ${i * 0.15}s infinite` }} />)}</li>}
        <div ref={bottom} />
      </ol>
      {err && <p role="alert" className="px-4 text-sm text-like">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={text} maxLength={1000} onChange={(e) => { setText(e.target.value); if (Date.now() - lastTypingPing.current > 2000) { lastTypingPing.current = Date.now(); fetch(`/api/messages/${id}`, { method: "POST" }).catch(() => null); } }} placeholder="Message…" className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 outline-none focus:border-violet" />
        <button className="px-3 font-semibold text-vtext" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}
