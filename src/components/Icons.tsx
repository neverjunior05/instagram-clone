// Original thin-line icon set (1.5px strokes), filled variants for active states.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { filled?: boolean; size?: number };
const base = (size = 24, filled?: boolean): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: "0 0 24 24", fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true });

export const Home = ({ filled, size, ...p }: P) => <svg {...base(size, filled)} {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
export const Compass = ({ filled, size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill={filled ? "currentColor" : "none"} /></svg>;
export const Plus = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const Film = ({ filled, size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="3" width="18" height="18" rx="4" fill={filled ? "currentColor" : "none"} /><path d="M10 9v6l5-3z" fill={filled ? "var(--bg)" : "none"} stroke={filled ? "var(--bg)" : "currentColor"} /></svg>;
export const Heart = ({ filled, size, ...p }: P) => <svg {...base(size, filled)} {...p}><path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 4 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4 20 4 22.4 7.3 21.2 10.7 19.5 15.4 12 20 12 20z" /></svg>;
export const Chat = ({ filled, size, ...p }: P) => <svg {...base(size, filled)} {...p}><path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 21l1.5-4.4A8.5 8.5 0 1 1 20.5 12z" /></svg>;
export const Send = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>;
export const Bookmark = ({ filled, size, ...p }: P) => <svg {...base(size, filled)} {...p}><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>;
export const Search = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const Bell = ({ filled, size, ...p }: P) => <svg {...base(size, filled)} {...p}><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" /></svg>;
export const Gear = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10.3 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" /></svg>;
export const Shield = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>;
export const Layers = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="7" y="7" width="13" height="13" rx="2" /><path d="M4 16V5a1 1 0 0 1 1-1h11" /></svg>;
export const Dots = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
export const Volume = ({ filled, size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 9v6h4l5 4V5L8 9z" />{filled ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m17 10 4 4m0-4-4 4" />}</svg>;
export const Lens = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v5M21 12h-5M12 21v-5M3 12h5" /></svg>;
