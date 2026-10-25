import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { media } from "@/config/media";
import Footer from "@/components/Footer";
import Landing from "@/components/Landing";

export default async function LandingPage() {
  const u = await getUser().catch(() => null);
  if (u) redirect("/home");
  const cols = [0, 1, 2, 3, 4, 5].map((c) => media.landingTiles.filter((_, i) => i % 6 === c));
  return (
    <div className="relative overflow-hidden">
      {/* Preloader: iris opens to reveal the app */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-[#0A0A0C]" style={{ animation: "fadeOut .4s 1.6s forwards" }}>
        <div className="holo-bg h-[100vmax] w-[100vmax]" style={{ animation: "iris 1.8s cubic-bezier(.7,0,.2,1) forwards" }} />
        <span className="absolute font-display text-4xl font-extrabold text-[#0A0A0C]">Lumio</span>
      </div>

      <section className="relative flex min-h-screen items-center">
        <div aria-hidden className="absolute -inset-20 opacity-30 blur-3xl"><div className="holo-bg absolute left-1/4 top-1/4 h-96 w-96 rounded-full" style={{ animation: "aurora 18s ease-in-out infinite" }} /></div>
        <Landing cols={cols} />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-muted">Independent demo project</p>
            <h1 className="font-display text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[0.95]">
              {["Share", "the", "light", "you", "see."].map((w, i) => <span key={w} className="mr-[0.25em] inline-block" style={{ animation: `wordIn .8s ${1.6 + i * 0.09}s cubic-bezier(.2,.8,.2,1) both` }}>{w}</span>)}
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted">Photos, carousels, reels, 24-hour stories and messages — in a cinematic gallery where your content is the star.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="create-btn rounded-full px-7 py-3.5 font-semibold">Create account</Link>
              <Link href="/login" className="rounded-full border border-line px-7 py-3.5 font-semibold hover:bg-elev">Log in</Link>
            </div>
            <p className="mt-4 text-sm text-muted"><Link href="/login" className="text-vtext underline">One-click demo access</Link> · Demo login: <span className="font-mono text-vtext">maya@lumio.demo</span> / <span className="font-mono text-vtext">lumio-demo</span></p>
          </div>
          <div className="mx-auto w-[280px] rounded-[42px] border border-line bg-surface p-3 shadow-2xl">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[32px] bg-bg">
              <span className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">DEMO FEED</span>
              <div className="flex flex-col" style={{ animation: "drift 30s linear infinite" }}>
                {[...media.landingTiles.slice(0, 6), ...media.landingTiles.slice(0, 6)].map((src, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
                    {i % 3 === 1 && <span className="absolute inset-0 flex items-center justify-center text-6xl text-white" style={{ animation: "heart 3s 1s infinite" }}>♥</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-12 text-center font-display text-4xl font-extrabold">Capture. Edit. Share.</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {[["Shoot", "none"], ["Edit", "saturate(1.6) hue-rotate(-12deg)"], ["Post", "contrast(1.1)"], ["Story", "grayscale(1) contrast(1.3)"]].map(([t, f], i) => (
            <div key={t} className="animate-rise overflow-hidden rounded-[14px] border border-line bg-surface" style={{ animationDelay: `${i * 0.12}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.photo("lumio-stage", 600, 750)} alt={`${t} stage example`} style={{ filter: f }} className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <p className="p-4 font-display font-bold"><span className="font-mono text-sm text-muted">0{i + 1} </span>{t}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 grid grid-cols-3 gap-4 text-center">
          {[["40", "demo creators"], ["240", "demo posts & reels"], ["12", "editor filters"]].map(([n, l]) => <div key={l}><div className="font-mono text-4xl font-bold">{n}</div><div className="text-sm text-muted">{l} (demo data)</div></div>)}
        </div>
      </section>
      <Footer />
    </div>
  );
}
