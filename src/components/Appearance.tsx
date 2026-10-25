"use client";
import { useEffect, useState } from "react";

/** Theme (dark/light/auto), reduce motion override, and "Take a break" reminder. */
export default function Appearance() {
  const [theme, setTheme] = useState("dark");
  const [rm, setRm] = useState(false);
  const [brk, setBrk] = useState(0);
  useEffect(() => { setTheme(localStorage.getItem("lumio-theme") || "dark"); setRm(localStorage.getItem("lumio-reduce-motion") === "1"); setBrk(Number(localStorage.getItem("lumio-break") || 0)); }, []);
  const applyTheme = (t: string) => {
    setTheme(t); localStorage.setItem("lumio-theme", t);
    document.documentElement.dataset.theme = t === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : t;
  };
  return (
    <section className="space-y-4 rounded-[14px] border border-line bg-surface p-5">
      <h2 className="font-semibold">Appearance & wellbeing</h2>
      <div className="flex gap-2" role="radiogroup" aria-label="Theme">{["dark", "light", "auto"].map((t) => <button key={t} role="radio" aria-checked={theme === t} onClick={() => applyTheme(t)} className={`min-h-9 rounded-full border px-4 text-sm capitalize ${theme === t ? "border-violet bg-violet text-white" : "border-line"}`}>{t}</button>)}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rm} onChange={(e) => { setRm(e.target.checked); localStorage.setItem("lumio-reduce-motion", e.target.checked ? "1" : "0"); document.documentElement.classList.toggle("reduce-motion", e.target.checked); }} /> Reduce motion (overrides OS setting)</label>
      <label className="block text-sm">Take a break reminder
        <select value={brk} onChange={(e) => { setBrk(+e.target.value); localStorage.setItem("lumio-break", e.target.value); }} className="ml-2 rounded-lg border border-line bg-bg px-2 py-1">
          <option value={0}>Off</option><option value={10}>Every 10 min</option><option value={20}>Every 20 min</option><option value={30}>Every 30 min</option>
        </select>
      </label>
    </section>
  );
}
