"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as I from "./Icons";

type U = { username: string; avatar: string; role: string } | null;
const BARE = ["/", "/login", "/register", "/onboarding"];

export default function Shell({ user, children }: { user: U; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const halo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable) return;
      if (e.key === "?") setHelp((h) => !h);
      if (e.key === "n" && user) router.push("/create");
      if (e.key === "Escape") setHelp(false);
    };
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse" && halo.current) halo.current.style.transform = `translate(${e.clientX - 144}px, ${e.clientY - 144}px)`; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointermove", onMove); };
  }, [router, user]);

  const bare = BARE.includes(path) || !user;
  const nav = user ? [
    { href: "/home", label: "Home", Icon: I.Home },
    { href: "/search", label: "Search", Icon: I.Search },
    { href: "/explore", label: "Explore", Icon: I.Compass },
    { href: "/reels", label: "Reels", Icon: I.Film },
    { href: "/messages", label: "Messages", Icon: I.Send },
    { href: "/notifications", label: "Notifications", Icon: I.Bell },
    { href: "/saved", label: "Saved", Icon: I.Bookmark },
    ...(["admin", "moderator"].includes(user.role) ? [{ href: "/admin", label: "Moderation", Icon: I.Shield }] : []),
    { href: "/settings", label: "Settings", Icon: I.Gear },
  ] : [];

  return (
    <>
      <div aria-hidden ref={halo} className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-72 w-72 rounded-full opacity-[0.07] blur-3xl md:block holo-bg motion-reduce:hidden" style={{ transform: "translate(-400px,-400px)" }} />
      {bare ? <main key={path} className="animate-rise">{children}</main> : (
        <div className="md:pl-[76px] xl:pl-[244px]">
          <nav aria-label="Primary" className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col gap-1 border-r border-line bg-bg px-3 py-6 md:flex xl:w-[244px]">
            <Link href="/home" className="mb-6 flex items-center gap-2 px-3 font-display text-2xl font-extrabold"><span className="holo-bg inline-block h-7 w-7 rounded-full" /><span className="hidden xl:inline">Lumio</span></Link>
            {nav.map(({ href, label, Icon }) => {
              const active = path.startsWith(href);
              return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-4 rounded-xl px-3 py-2.5 transition hover:bg-elev ${active ? "font-semibold" : "text-fg/85"}`}><Icon filled={active} /><span className="hidden xl:inline">{label}</span></Link>;
            })}
            <Link href="/create" className="create-btn mt-2 flex min-h-11 items-center gap-4 rounded-xl px-3 py-2.5 font-semibold"><I.Plus /><span className="hidden xl:inline">Create</span></Link>
            <Link href={`/u/${user!.username}`} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 hover:bg-elev">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={user!.avatar} alt="" className="h-7 w-7 rounded-full bg-elev" /><span className="hidden truncate xl:inline">{user!.username}</span>
            </Link>
            <button onClick={() => setHelp(true)} className="hidden rounded-xl px-3 py-2 text-left text-xs text-muted hover:bg-elev xl:block">Keyboard shortcuts (?)</button>
          </nav>
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur md:hidden">
            <Link href="/home" className="font-display text-xl font-extrabold">Lumio</Link>
            <div className="flex gap-1"><Link aria-label="Notifications" href="/notifications" className="p-2.5"><I.Bell /></Link><Link aria-label="Messages" href="/messages" className="p-2.5"><I.Send /></Link></div>
          </header>
          <main key={path} className="animate-rise pb-20 md:pb-0">{children}</main>
          <nav aria-label="Primary mobile" className="pb-safe fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-bg/95 backdrop-blur md:hidden">
            {[{ href: "/home", Icon: I.Home, l: "Home" }, { href: "/explore", Icon: I.Compass, l: "Explore" }].map(({ href, Icon, l }) => <Link key={href} href={href} aria-label={l} className="p-3"><Icon filled={path.startsWith(href)} /></Link>)}
            <Link href="/create" aria-label="Create" className="holo-bg -mt-5 flex h-12 w-12 items-center justify-center rounded-2xl text-black shadow-lg"><I.Plus /></Link>
            <Link href="/reels" aria-label="Reels" className="p-3"><I.Film filled={path.startsWith("/reels")} /></Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Link href={`/u/${user!.username}`} aria-label="Profile" className="p-3"><img src={user!.avatar} alt="" className="h-6 w-6 rounded-full" /></Link>
          </nav>
        </div>
      )}
      {help && (
        <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-[14px] border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Keyboard shortcuts</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[["J / K", "Next / previous post"], ["L", "Like focused post"], ["S", "Save focused post"], ["C", "Open comments"], ["N", "Create"], ["M", "Mute / unmute reel"], ["?", "Toggle this dialog"]].map(([k, v]) => <div key={k} className="contents"><dt className="font-mono text-vtext">{k}</dt><dd className="text-muted">{v}</dd></div>)}
            </dl>
            <button onClick={() => setHelp(false)} className="mt-5 w-full rounded-xl bg-violet py-2.5 font-semibold text-white">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
