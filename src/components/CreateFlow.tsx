"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPost, createStory } from "@/lib/actions";
import { FILTERS, filterCss } from "@/lib/logic";
import { categories, media as mediaCfg } from "@/config/media";
import confettiBurst from "./confetti";

type Item = { url: string; alt: string; type: "image" | "video"; poster?: string };
type Mode = "post" | "reel" | "story";
const RATIOS = { "1:1": "aspect-square", "4:5": "aspect-[4/5]", "16:9": "aspect-video" } as const;

export default function CreateFlow({ initialMode }: { initialMode: "post" | "story" }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [items, setItems] = useState<Item[]>([]);
  const [url, setUrl] = useState("");
  const [sel, setSel] = useState(0);
  const [filter, setFilter] = useState("none");
  const [k, setK] = useState(1);
  const [adj, setAdj] = useState({ b: 1, c: 1, s: 1 });
  const [ratio, setRatio] = useState<keyof typeof RATIOS>("4:5");
  const [compare, setCompare] = useState(false);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Photography");
  const [hideLikes, setHideLikes] = useState(false);
  const [commentsOff, setCommentsOff] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [closeFriends, setCloseFriends] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState<number | null>(null);

  const add = (u = url.trim()) => {
    if (!u) return;
    if (items.length >= (mode === "post" ? 10 : 1)) return setErr(mode === "post" ? "Up to 10 items per post." : "One item only.");
    const isVideo = mode === "reel" || /\.(mp4|webm|mov)(\?|$)/i.test(u);
    setItems([...items, { url: u, alt: "", type: isVideo ? "video" : "image", poster: isVideo ? mediaCfg.photo(`poster-${Date.now()}`, 720, 1280) : undefined }]);
    setUrl(""); setErr(""); setSel(items.length);
  };
  const filterCode = filter === "none" ? "none" : `${filter}:${k.toFixed(2)}`;
  const cssFilter = `${filterCss(filterCode) === "none" ? "" : filterCss(filterCode)} brightness(${adj.b}) contrast(${adj.c}) saturate(${adj.s})`;
  const reorder = (from: number, to: number) => { const n = [...items]; const [x] = n.splice(from, 1); n.splice(to, 0, x); setItems(n); setSel(to); };
  const cur = items[sel];

  const publish = () => start(async () => {
    setErr("");
    if (mode === "story") {
      const r = await createStory(items[0]?.url ?? "", storyText, closeFriends);
      if (r.error) return setErr(r.error);
      confettiBurst(); router.push("/home"); return;
    }
    if (items.some((i) => !i.alt.trim()) && !confirm("Some media has no alt text. Alt text helps people using screen readers. Publish anyway?")) return;
    const r = await createPost({ kind: mode, media: items, caption, location, filter: filterCode, hideLikes, commentsOff, category });
    if (r.error) return setErr(r.error);
    confettiBurst(); router.push(`/p/${r.id}`);
  });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Create</h1>
        <div role="tablist" className="flex rounded-full border border-line p-1 text-sm">{(["post", "reel", "story"] as Mode[]).map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setItems([]); }} className={`min-h-9 rounded-full px-4 capitalize ${mode === m ? "bg-violet text-white" : ""}`}>{m}</button>)}</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={mode === "reel" ? "Video URL (https, ≤60s)…" : "Image URL (https)…"} aria-label="Media URL" className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm" />
            <button onClick={() => add()} className="rounded-xl bg-violet px-4 font-semibold text-white">Add</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">Try:
            <button className="text-vtext" onClick={() => add(mode === "reel" ? mediaCfg.reels[0] : mediaCfg.photo(`new-${Date.now()}`))}>sample {mode === "reel" ? "video" : "photo"}</button>
            <span>· Cloudinary upload activates when CLOUDINARY_* keys are set. EXIF location is never stored (URL-only media).</span>
          </div>
          {cur ? (
            <div className={`relative mx-auto mt-4 max-w-lg overflow-hidden rounded-[6px] bg-elev ${mode === "post" ? RATIOS[ratio] : "aspect-[9/16] max-w-xs"}`}
              onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}>
              {cur.type === "video" ? <video src={cur.url} poster={cur.poster} muted loop playsInline autoPlay controls className="h-full w-full object-cover" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={cur.url} alt={cur.alt} className="h-full w-full object-cover" style={{ filter: compare ? "none" : cssFilter }} />}
              {cur.type === "image" && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{compare ? "Before" : "Hold to compare"}</span>}
              {mode === "story" && storyText && <p className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-xl bg-black/60 px-3 py-1 font-bold text-white">{storyText}</p>}
            </div>
          ) : <div className="mt-4 flex aspect-[4/5] max-w-lg items-center justify-center rounded-[14px] border border-dashed border-line text-muted mx-auto">Add media to begin</div>}
          {items.length > 1 && <ol className="mt-3 flex gap-2 overflow-x-auto" aria-label="Filmstrip (drag to reorder)">{items.map((it, i) => (
            <li key={it.url + i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drag !== null && reorder(drag, i)}
              className={`relative h-16 w-16 shrink-0 cursor-grab overflow-hidden rounded transition-transform ${i === sel ? "ring-2 ring-violet" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <button onClick={() => setSel(i)} className="h-full w-full"><img src={it.poster || it.url} alt={`Item ${i + 1}`} className="h-full w-full object-cover" /></button>
              <button aria-label="Remove" onClick={() => { setItems(items.filter((_, j) => j !== i)); setSel(0); }} className="absolute right-0 top-0 bg-black/70 px-1 text-xs text-white">✕</button>
            </li>))}</ol>}
          {cur?.type === "image" && mode !== "story" && <>
            <div className="mt-4 flex gap-2">{(Object.keys(RATIOS) as (keyof typeof RATIOS)[]).map((r) => <button key={r} onClick={() => setRatio(r)} className={`rounded-full border px-3 py-1 font-mono text-xs ${ratio === r ? "border-violet text-vtext" : "border-line"}`}>{r}</button>)}</div>
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">{FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className="w-20 shrink-0 text-center text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.url} alt="" style={{ filter: f.css(1) }} className={`mb-1 aspect-square w-full rounded object-cover ${filter === f.id ? "ring-2 ring-violet" : ""}`} />{f.name}
              </button>))}</div>
            <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
              {filter !== "none" && <label>Intensity <input type="range" min={0} max={1} step={0.05} value={k} onChange={(e) => setK(+e.target.value)} className="w-full accent-[#7B61FF]" /></label>}
              {([["b", "Brightness"], ["c", "Contrast"], ["s", "Saturation"]] as const).map(([key, l]) => <label key={key}>{l} <input type="range" min={0.5} max={1.5} step={0.05} value={adj[key]} onChange={(e) => setAdj({ ...adj, [key]: +e.target.value })} className="w-full accent-[#7B61FF]" /></label>)}
            </div>
          </>}
        </div>
        <aside className="space-y-4 rounded-[14px] border border-line bg-surface p-4">
          {mode === "story" ? <>
            <label className="block text-sm">Text sticker<input value={storyText} maxLength={80} onChange={(e) => setStoryText(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2" /></label>
            <div className="flex flex-wrap gap-2">{["😍", "🔥", "✨", "📍", "Poll: Yes/No?", "Ask me anything"].map((e) => <button key={e} onClick={() => setStoryText((t) => `${t} ${e}`.trim())} className="rounded-full bg-elev px-3 py-1 text-sm">{e}</button>)}</div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={closeFriends} onChange={(e) => setCloseFriends(e.target.checked)} className="accent-[#3DDBA8]" /> Close friends only</label>
            <p className="text-xs text-muted">Stories disappear after 24 hours. Save them to Highlights from the viewer.</p>
          </> : <>
            {cur && <label className="block text-sm">Alt text for item {sel + 1}<input value={cur.alt} maxLength={200} onChange={(e) => setItems(items.map((it, i) => i === sel ? { ...it, alt: e.target.value } : it))} placeholder="Describe this for people who can't see it" className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2" /></label>}
            <label className="block text-sm">Caption<textarea value={caption} maxLength={2200} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption… use #tags and @mentions" className="mt-1 h-32 w-full rounded-xl border border-line bg-bg px-3 py-2" /><span className="font-mono text-xs text-muted">{caption.length}/2200</span></label>
            <label className="block text-sm">Location<input value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2" /></label>
            <label className="block text-sm">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2">{categories.slice(1).map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hideLikes} onChange={(e) => setHideLikes(e.target.checked)} /> Hide like count</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={commentsOff} onChange={(e) => setCommentsOff(e.target.checked)} /> Turn off comments</label>
          </>}
          {err && <p role="alert" className="text-sm text-[#F0445A]">{err}</p>}
          <button disabled={pending || !items.length} onClick={publish} className="create-btn w-full rounded-xl py-3 font-semibold disabled:opacity-50">{pending ? "Publishing…" : mode === "story" ? "Share to story" : "Share"}</button>
        </aside>
      </div>
    </div>
  );
}
