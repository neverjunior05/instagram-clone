"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type U = { username: string; name: string; avatar: string };
/** Instant client-side fuzzy-ish search (subsequence scoring) with recent searches. */
function score(q: string, s: string) {
  s = s.toLowerCase(); q = q.toLowerCase();
  if (s.startsWith(q)) return 3;
  if (s.includes(q)) return 2;
  let i = 0; for (const ch of s) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}
export default function SearchBox({ users, tags, places }: { users: U[]; tags: string[]; places: string[] }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem("lumio-recent") || "[]")); } catch { /* ignore */ } }, []);
  const remember = (v: string) => { const n = [v, ...recent.filter((r) => r !== v)].slice(0, 8); setRecent(n); localStorage.setItem("lumio-recent", JSON.stringify(n)); };
  const res = useMemo(() => {
    if (!q.trim()) return null;
    const t = q.replace(/^[#@]/, "");
    return {
      users: users.map((u) => ({ u, s: Math.max(score(t, u.username), score(t, u.name)) })).filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.u),
      tags: tags.filter((x) => score(t, x)).slice(0, 5), places: places.filter((x) => score(t, x)).slice(0, 4),
    };
  }, [q, users, tags, places]);
  return (
    <div>
      <label htmlFor="sq" className="sr-only">Search</label>
      <input id="sq" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full rounded-xl bg-elev px-4 py-3 outline-none focus:ring-2 focus:ring-violet" />
      <div aria-live="polite" className="mt-3">
        {!res && recent.length > 0 && <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Recent</span><button className="text-vtext" onClick={() => { setRecent([]); localStorage.removeItem("lumio-recent"); }}>Clear all</button></div>{recent.map((r) => <Link key={r} href={r} className="block py-2 text-sm text-muted">{r}</Link>)}</div>}
        {res && <ul className="divide-y divide-line">
          {res.users.map((u) => <li key={u.username}><Link onClick={() => remember(`/u/${u.username}`)} href={`/u/${u.username}`} className="flex items-center gap-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.avatar} alt="" className="h-10 w-10 rounded-full bg-elev" /><span className="text-sm"><b>{u.username}</b><span className="block text-muted">{u.name}</span></span></Link></li>)}
          {res.tags.map((t) => <li key={t}><Link onClick={() => remember(`/tag/${t}`)} href={`/tag/${t}`} className="block py-3 text-sm">#{t}</Link></li>)}
          {res.places.map((p) => <li key={p} className="py-3 text-sm text-muted">📍 {p}</li>)}
          {!res.users.length && !res.tags.length && !res.places.length && <li className="py-6 text-center text-sm text-muted">No results for “{q}”</li>}
        </ul>}
      </div>
    </div>
  );
}
