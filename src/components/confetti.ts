// Lightweight holographic confetti (no dependency). Skipped when reduced motion is on.
export default function confettiBurst() {
  if (typeof window === "undefined") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion")) return;
  const colors = ["#7CF7E4", "#8B7BFF", "#FF6BD6", "#FFD36B"];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement("span");
    const x = (Math.random() - 0.5) * 600, y = -Math.random() * 500 - 100;
    Object.assign(el.style, { position: "fixed", left: "50%", top: "60%", width: "8px", height: "8px", borderRadius: "2px", background: colors[i % 4], zIndex: "999", pointerEvents: "none" });
    document.body.appendChild(el);
    el.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: `translate(${x}px, ${y}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => el.remove();
  }
}
