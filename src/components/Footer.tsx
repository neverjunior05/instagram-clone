import Link from "next/link";
import { credits } from "@/config/media";

export default function Footer({ compact }: { compact?: boolean }) {
  return (
    <footer className={`text-xs leading-relaxed text-muted ${compact ? "" : "border-t border-line px-6 py-10"}`}>
      <p className="mb-2"><Link href="/policies" className="hover:underline">Policies</Link> · <Link href="/policies#credits" className="hover:underline">Credits</Link> · <Link href="/search" className="hover:underline">Search</Link></p>
      <p>Lumio is an independent demo & learning project. It is not affiliated with, endorsed by, or a copy of any existing company&apos;s product. All users, posts, videos and messages are fictional test data.</p>
      {!compact && <ul id="credits" className="mt-3 space-y-1">{credits.map((c) => <li key={c.name}><a href={c.url} className="hover:underline" rel="noopener noreferrer" target="_blank">{c.name}</a> — {c.license}</li>)}</ul>}
      <p className="mt-2">© {new Date().getFullYear()} Lumio demo</p>
    </footer>
  );
}
