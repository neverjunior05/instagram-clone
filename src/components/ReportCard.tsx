"use client";
import { useState, useTransition } from "react";
import { moderate } from "@/lib/actions";

type R = { id: number; target_type: string; target_id: number; reason: string; status: string; created_at: string; reporter: string; preview: string | null; thumb: string | null };

export default function ReportCard({ r }: { r: R }) {
  const [gone, setGone] = useState(false);
  const [note, setNote] = useState("");
  const [, start] = useTransition();
  const act = (a: "dismiss" | "remove" | "warn" | "suspend") => start(async () => { await moderate(r.id, a, note); setGone(true); });
  return (
    <div className={`flex gap-4 rounded-[14px] border border-line bg-surface p-4 transition-all duration-500 ${gone ? "translate-x-full opacity-0" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {r.thumb && <img src={r.thumb} alt="" className="h-20 w-20 rounded object-cover" />}
      <div className="min-w-0 flex-1 text-sm">
        <p><span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${r.status === "open" ? "bg-[#F5A524]/20 text-[#F5A524]" : "bg-mint/20 text-mint"}`}>{r.status}</span><b>{r.reason}</b> · {r.target_type} #{r.target_id} · reported by {r.reporter}</p>
        <p className="mt-1 line-clamp-2 text-muted">{r.preview ?? "(content deleted)"}</p>
        {r.status === "open" && <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note shown to user (transparency)" className="min-w-40 flex-1 rounded-lg border border-line bg-bg px-2 py-1" />
          <button onClick={() => act("dismiss")} className="rounded-lg bg-elev px-3 py-1">Dismiss</button>
          <button onClick={() => act("warn")} className="rounded-lg bg-elev px-3 py-1">Warn</button>
          <button onClick={() => act("remove")} className="rounded-lg bg-[#F0445A]/20 px-3 py-1 text-[#F0445A]">Remove</button>
          <button onClick={() => act("suspend")} className="rounded-lg bg-[#F0445A] px-3 py-1 text-white">Suspend</button>
        </div>}
      </div>
    </div>
  );
}
