"use client";
import { useEffect, useState } from "react";

/** Drifting, tilted wall of tiles that parallaxes with the mouse (disabled with reduced motion). */
export default function Landing({ cols }: { cols: string[][] }) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion")) return;
    const f = (e: PointerEvent) => setP({ x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 });
    addEventListener("pointermove", f);
    return () => removeEventListener("pointermove", f);
  }, []);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden opacity-25">
      <div className="absolute -inset-40 flex gap-4" style={{ transform: `rotate(-12deg) translate(${p.x * -30}px, ${p.y * -30}px)`, transition: "transform .6s ease-out" }}>
        {cols.map((c, i) => (
          <div key={i} className="flex w-56 shrink-0 flex-col gap-4" style={{ animation: `drift ${50 + i * 7}s linear infinite ${i % 2 ? "reverse" : ""}` }}>
            {[...c, ...c, ...c].map((src, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={src} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-[6px] object-cover" />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/40" />
    </div>
  );
}
