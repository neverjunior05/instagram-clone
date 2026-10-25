"use client";
import { useState, useTransition } from "react";
import { deletePost, updateCaption } from "@/lib/actions";

export default function OwnerTools({ id, caption }: { id: number; caption: string }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(caption);
  const [, start] = useTransition();
  return (
    <div className="mb-4 rounded-[14px] border border-line p-3 text-sm">
      {edit ? (
        <div className="space-y-2">
          <textarea value={text} maxLength={2200} onChange={(e) => setText(e.target.value)} className="h-28 w-full rounded-xl border border-line bg-surface p-2" aria-label="Edit caption" />
          <div className="flex justify-between text-xs text-muted"><span className="font-mono">{text.length}/2200</span><button className="font-semibold text-vtext" onClick={() => start(async () => { await updateCaption(id, text); setEdit(false); })}>Save caption</button></div>
        </div>
      ) : (
        <div className="flex gap-4"><button onClick={() => setEdit(true)} className="text-vtext">Edit caption</button><button onClick={() => { if (confirm("Delete this post? This can't be undone.")) start(() => deletePost(id)); }} className="text-like">Delete</button></div>
      )}
    </div>
  );
}
