import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getExplore } from "@/lib/data";
import { categories } from "@/config/media";
import Grid from "@/components/Grid";

export const metadata = { title: "Explore" };
type Props = { searchParams: Promise<{ c?: string }> };

export default async function ExplorePage({ searchParams }: Props) {
  const c = (await searchParams).c;
  const cat = c && categories.includes(c) && c !== "All" ? c : null;
  const u = await getUser();
  const posts = await getExplore(u?.id ?? 0, cat, null);
  return (
    <div className="mx-auto max-w-[935px] md:p-6">
      <Link href="/search" className="mx-3 mb-3 flex items-center rounded-xl bg-elev px-4 py-2.5 text-sm text-muted md:mx-0">Search accounts, tags, places…</Link>
      <nav aria-label="Categories" className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-3 md:px-0">
        {categories.map((k) => {
          const active = (cat ?? "All") === k;
          return <Link key={k} href={k === "All" ? "/explore" : `/explore?c=${k}`} aria-current={active ? "page" : undefined} className={`min-h-9 shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${active ? "border-violet bg-violet text-white" : "border-line hover:bg-elev"}`}>{k}</Link>;
        })}
      </nav>
      <Grid posts={posts} mosaic empty="Nothing here yet" />
    </div>
  );
}
