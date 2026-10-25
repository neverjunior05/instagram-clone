import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import { groupLabel, groupNotifications, timeAgo } from "@/lib/logic";
import { markNotificationsRead, respondFollow } from "@/lib/actions";

export const metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

const TEXT: Record<string, string> = { like: "liked your post", comment: "commented on your post", mention: "mentioned you", tag: "tagged you in a post", follow: "started following you", follow_request: "requested to follow you", story_reply: "replied to your story", dm_request: "sent you a message request" };

export default async function NotificationsPage() {
  const u = await getUser();
  if (!u) redirect("/login");
  // Notifications from blocked users are never shown.
  const rows = await q<{ id: number; type: string; post_id: number | null; actor: string; actor_id: number; avatar: string; read: boolean; created_at: string; thumb: string | null; pending: boolean }>(
    `SELECT n.id, n.type, n.post_id, n.read, n.created_at, n.actor_id, a.username AS actor, a.avatar,
      (SELECT COALESCE(p.media->0->>'poster', p.media->0->>'url') FROM posts p WHERE p.id=n.post_id AND p.deleted_at IS NULL) AS thumb,
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=n.actor_id AND f.following_id=$1 AND f.status='pending') AS pending
     FROM notifications n JOIN users a ON a.id=n.actor_id WHERE n.user_id=$1 AND a.status='active'
     AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.kind='block' AND b.blocker_id=$1 AND b.blocked_id=a.id) ORDER BY n.id DESC LIMIT 100`, [u.id]);
  const groups = groupNotifications(rows);
  await markNotificationsRead();
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 font-display text-2xl font-extrabold">Notifications</h1>
      {!groups.length && <p className="py-10 text-center text-muted">Nothing yet. Activity on your posts will appear here.</p>}
      <ul className="space-y-1" aria-live="polite">
        {groups.map(({ first: n, actors }, i) => (
          <li key={n.id} className={`flex items-center gap-3 rounded-xl p-3 animate-rise ${!n.read ? "bg-violet/10" : ""}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.avatar} alt="" className="h-10 w-10 rounded-full bg-elev" />
            <p className="flex-1 text-sm"><Link href={`/u/${n.actor}`} className="font-semibold">{groupLabel(actors)}</Link> {TEXT[n.type] ?? n.type} <span className="font-mono text-xs text-muted">{timeAgo(n.created_at)}</span></p>
            {n.type === "follow_request" && n.pending && <div className="flex gap-2">
              <form action={respondFollow.bind(null, n.actor_id, true)}><button className="rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-white">Confirm</button></form>
              <form action={respondFollow.bind(null, n.actor_id, false)}><button className="rounded-lg bg-elev px-3 py-1.5 text-xs">Delete</button></form></div>}
            {n.type === "dm_request" && <Link href="/messages" className="text-xs text-vtext">View</Link>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {n.thumb && n.post_id && <Link href={`/p/${n.post_id}`}><img src={n.thumb} alt="" className="h-11 w-11 rounded object-cover" /></Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
