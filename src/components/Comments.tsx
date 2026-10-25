"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addComment, pinComment } from "@/lib/actions";
import { timeAgo } from "@/lib/logic";
import { Caption } from "./PostCard";
import * as I from "./Icons";

export type C = { id: number; body: string; parent_id: number | null; pinned: boolean; created_at: string; username: string; avatar: string; fresh?: boolean };

export default function Comments({ postId, initial, canPin, disabled }: { postId: number; initial: C[]; canPin: boolean; disabled: boolean }) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<C | null>(null);
  const [err, setErr] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const roots = list.filter((c) => !c.parent_id);

  const submit = () => start(async () => {
    setErr("");
    try {
      const r = await addComment(postId, text, replyTo ? (replyTo.parent_id ?? replyTo.id) : null);
      if ("hidden" in r) setErr("Your comment was hidden by the author's filter.");
      else if (r.comment) setList((l) => [...l, { ...(r.comment as C), fresh: true }]);
      setText(""); setReplyTo(null);
    } catch (e) { setErr((e as Error).message); }
  });

  const Item = ({ c, child }: { c: C; child?: boolean }) => (
    <li className={`flex gap-3 rounded-lg p-2 transition-colors duration-1000 ${c.fresh ? "bg-violet/10" : ""} ${child ? "ml-11 border-l border-line pl-3" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full bg-elev" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words"><Link href={`/u/${c.username}`} className="mr-1.5 font-semibold">{c.username}</Link><Caption text={c.body} /></p>
        <div className="mt-1 flex gap-3 text-xs text-muted">
          <span suppressHydrationWarning className="font-mono">{timeAgo(c.created_at)}</span>
          {c.pinned && <span className="text-gold">📌 Pinned</span>}
          {!disabled && <button onClick={() => { setReplyTo(c); setText(`@${c.username} `); }}>Reply</button>}
          {canPin && !child && <button onClick={() => start(() => pinComment(c.id).then(() => setList((l) => l.map((x) => x.id === c.id ? { ...x, pinned: !x.pinned } : x))))}>{c.pinned ? "Unpin" : "Pin"}</button>}
        </div>
      </div>
      <button aria-label="Like comment" onClick={() => setLiked((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className={`self-start p-1 ${liked.has(c.id) ? "animate-pop text-like" : "text-muted"}`}><I.Heart size={14} filled={liked.has(c.id)} /></button>
    </li>
  );

  return (
    <section aria-label="Comments" className="flex flex-col">
      <h2 className="mb-2 font-semibold">Comments</h2>
      {roots.length === 0 && <p className="py-8 text-center text-sm text-muted">No comments yet. Start the conversation.</p>}
      <ul className="max-h-[60vh] space-y-1 overflow-y-auto" aria-live="polite">
        {roots.map((c) => <div key={c.id}><Item c={c} />{list.filter((r) => r.parent_id === c.id).map((r) => <Item key={r.id} c={r} child />)}</div>)}
      </ul>
      {disabled ? <p className="mt-4 text-sm text-muted">Comments are unavailable.</p> : (
        <form className="sticky bottom-16 mt-3 flex gap-2 border-t border-line bg-bg pt-3 md:bottom-0" onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(); }}>
          <label className="sr-only" htmlFor="cbox">Add a comment</label>
          <input id="cbox" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? `Replying to ${replyTo.username}…` : "Add a comment…"} className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-violet" />
          <button disabled={pending || !text.trim()} className="px-3 text-sm font-semibold text-vtext disabled:opacity-40">Post</button>
        </form>
      )}
      {err && <p role="alert" className="mt-2 text-sm text-[#F0445A]">{err}</p>}
    </section>
  );
}
