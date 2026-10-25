import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getStoryUsers, getSuggestions } from "@/lib/data";
import Feed from "@/components/Feed";
import FollowButton from "@/components/FollowButton";
import Footer from "@/components/Footer";

export const metadata = { title: "Home", robots: { index: false } };

export default async function HomePage() {
  const u = await getUser();
  if (!u) redirect("/login");
  const [stories, sugg] = await Promise.all([getStoryUsers(u.id), getSuggestions(u.id)]);
  return (
    <div className="mx-auto flex max-w-[1000px] justify-center gap-16 md:pt-6">
      <div className="w-full max-w-[470px]">
        <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto px-3 py-2 md:px-0" aria-label="Stories">
          <Link href="/create?story=1" className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
            <span className="ring-seen relative"><span className="flex h-14 w-14 items-center justify-center bg-elev text-2xl">+</span></span>Your story
          </Link>
          {stories.map((s) => (
            <Link key={s.user_id} href={`/stories/${s.username}`} className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="holo-ring block"><img src={s.avatar} alt="" className="block h-14 w-14 bg-elev" /></span>
              <span className="w-full truncate text-center">{s.username}</span>
            </Link>
          ))}
        </div>
        <Feed />
      </div>
      <aside className="hidden w-[300px] shrink-0 lg:block">
        <div className="sticky top-6 space-y-4">
          <Link href={`/u/${u.username}`} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.avatar} alt="" className="h-11 w-11 rounded-full bg-elev" />
            <div className="text-sm"><div className="font-semibold">{u.username}</div><div className="text-muted">{u.name}</div></div>
          </Link>
          <h2 className="text-sm font-semibold text-muted">Suggested for you</h2>
          <ul className="space-y-3">
            {sugg.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.avatar} alt="" className="h-8 w-8 rounded-full bg-elev" />
                <Link href={`/u/${s.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold">{s.username}<span className="block text-xs font-normal text-muted">Popular on Lumio</span></Link>
                <FollowButton userId={s.id} initial={null} small />
              </li>
            ))}
          </ul>
          <Footer compact />
        </div>
      </aside>
    </div>
  );
}
