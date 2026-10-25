"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openConversation, report, toggleCloseFriend, toggleRelation } from "@/lib/actions";
import * as I from "./Icons";

export default function ProfileActions({ userId, username }: { userId: number; username: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const act = async (fn: () => Promise<unknown>, done: string) => { try { await fn(); setMsg(done); } catch (e) { setMsg((e as Error).message); } setOpen(false); };
  return (
    <div className="relative flex items-center gap-2">
      <button onClick={async () => { try { const id = await openConversation(userId); router.push(`/messages/${id}`); } catch (e) { setMsg((e as Error).message); } }} className="min-h-9 rounded-xl bg-elev px-4 text-sm font-semibold">Message</button>
      <button aria-label="More options" aria-expanded={open} onClick={() => setOpen(!open)} className="p-2"><I.Dots /></button>
      {open && <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-[14px] border border-line bg-elev text-sm shadow-xl">
        <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={() => act(() => toggleCloseFriend(userId), "Close friends list updated")}>Add/remove close friend</button>
        <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={() => act(() => toggleRelation(userId, "mute"), "Post mute toggled")}>Mute posts</button>
        <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={() => act(() => toggleRelation(userId, "mute_story"), "Story mute toggled")}>Mute stories</button>
        <button className="block w-full px-4 py-3 text-left hover:bg-line" onClick={() => act(() => toggleRelation(userId, "restrict"), "Restrict toggled — their comments are hidden from you")}>Restrict</button>
        <button className="block w-full px-4 py-3 text-left text-like hover:bg-line" onClick={() => { if (confirm(`Block ${username}? They won't be able to find your profile, posts or message you.`)) act(() => toggleRelation(userId, "block"), "Blocked"); }}>Block</button>
        <button className="block w-full px-4 py-3 text-left text-like hover:bg-line" onClick={() => { const r = prompt("Reason for reporting this account?"); if (r) act(() => report("user", userId, r), "Report sent to moderators"); }}>Report</button>
      </div>}
      {msg && <span role="status" className="absolute left-0 top-11 whitespace-nowrap text-xs text-mint">{msg}</span>}
    </div>
  );
}
