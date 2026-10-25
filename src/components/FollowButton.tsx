"use client";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/lib/actions";

export default function FollowButton({ userId, initial, small }: { userId: number; initial: string | null; small?: boolean }) {
  const [status, setStatus] = useState(initial);
  const [pending, start] = useTransition();
  const label = status === "active" ? "Following ✓" : status === "pending" ? "Requested" : "Follow";
  return (
    <button disabled={pending} aria-pressed={!!status}
      onClick={() => start(async () => { try { const r = await toggleFollow(userId); setStatus(r.status); } catch { /* keep state */ } })}
      className={small ? `text-xs font-semibold ${status ? "text-muted" : "text-vtext"}` : `min-h-9 rounded-xl px-5 text-sm font-semibold transition-all duration-300 ${status ? "bg-elev" : "bg-violet text-white hover:bg-violet-bright"}`}>
      {label}
    </button>
  );
}
