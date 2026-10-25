// Pure, client-safe logic: ranking, parsing, grouping, filters, rate limiting.

/** Suggested ranking: score = (likes + 2*comments + 3*saves + 1) / (ageHours + 2)^1.5 */
export function rankScore(p: { likes: number; comments: number; saves: number; ageHours: number }) {
  return (p.likes + 2 * p.comments + 3 * p.saves + 1) / Math.pow(p.ageHours + 2, 1.5);
}
export const RANKING_EXPLAINER = "Suggested shows public posts from accounts you don't follow, ranked by (likes + 2×comments + 3×saves + 1) ÷ (hours since posting + 2)^1.5. Muted and blocked accounts are always excluded.";

export type Token = { t: "text" | "tag" | "mention"; v: string };
export function parseCaption(s: string): Token[] {
  const out: Token[] = [];
  const re = /([#@])([\p{L}\p{N}_.]{1,30})/gu;
  let last = 0;
  for (const m of s.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: "text", v: s.slice(last, i) });
    out.push({ t: m[1] === "#" ? "tag" : "mention", v: m[2].replace(/\.$/, "") });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}
export const extractTags = (s: string) => parseCaption(s).filter((x) => x.t === "tag").map((x) => x.v.toLowerCase());

/** Groups notifications by type+post: "Maya and 5 others liked your photo". */
export function groupNotifications<N extends { type: string; post_id: number | null; actor: string }>(list: N[]) {
  const map = new Map<string, { first: N; actors: string[] }>();
  for (const n of list) {
    const k = ["like", "comment"].includes(n.type) ? `${n.type}:${n.post_id}` : `${n.type}:${Math.random()}`;
    const g = map.get(k);
    if (g) { if (!g.actors.includes(n.actor)) g.actors.push(n.actor); } else map.set(k, { first: n, actors: [n.actor] });
  }
  return [...map.values()];
}
export function groupLabel(actors: string[]) {
  return actors.length === 1 ? actors[0] : `${actors[0]} and ${actors.length - 1} other${actors.length > 2 ? "s" : ""}`;
}

export const FILTERS: { id: string; name: string; css: (k: number) => string }[] = [
  { id: "none", name: "Original", css: () => "none" },
  { id: "lumen", name: "Lumen", css: (k) => `brightness(${1 + 0.15 * k}) contrast(${1 + 0.1 * k})` },
  { id: "warm", name: "Ember", css: (k) => `sepia(${0.35 * k}) saturate(${1 + 0.4 * k})` },
  { id: "cool", name: "Glacier", css: (k) => `hue-rotate(${-15 * k}deg) saturate(${1 + 0.2 * k})` },
  { id: "fade", name: "Fade", css: (k) => `contrast(${1 - 0.25 * k}) brightness(${1 + 0.08 * k})` },
  { id: "mono", name: "Mono", css: (k) => `grayscale(${k}) contrast(${1 + 0.2 * k})` },
  { id: "noir", name: "Noir", css: (k) => `grayscale(${k}) contrast(${1 + 0.6 * k}) brightness(${1 - 0.1 * k})` },
  { id: "vivid", name: "Vivid", css: (k) => `saturate(${1 + 0.8 * k}) contrast(${1 + 0.1 * k})` },
  { id: "dusk", name: "Dusk", css: (k) => `hue-rotate(${20 * k}deg) saturate(${1 + 0.3 * k}) brightness(${1 - 0.05 * k})` },
  { id: "film", name: "Film", css: (k) => `sepia(${0.2 * k}) contrast(${1 + 0.15 * k}) saturate(${1 - 0.15 * k})` },
  { id: "holo", name: "Holo", css: (k) => `hue-rotate(${35 * k}deg) saturate(${1 + 0.5 * k})` },
  { id: "matte", name: "Matte", css: (k) => `contrast(${1 - 0.15 * k}) saturate(${1 - 0.3 * k})` },
];
/** Encodes filter as "id:intensity" and returns the CSS filter string. */
export function filterCss(code: string | null | undefined) {
  if (!code || code === "none") return "none";
  const [id, k] = code.split(":");
  const f = FILTERS.find((x) => x.id === id);
  return f ? f.css(Math.max(0, Math.min(1, Number(k ?? 1)))) : "none";
}

export function timeAgo(d: string | Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Fixed-window in-memory limiter. Returns true if allowed. */
export function rateLimit(key: string, max: number, windowMs: number) {
  // Limits are off by default for the demo; set RATE_LIMITS=on in production.
  if (typeof process === "undefined" || process.env.RATE_LIMITS !== "on") return true;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true; }
  b.n++;
  return b.n <= max;
}
