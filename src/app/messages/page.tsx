import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import { timeAgo } from "@/lib/logic";
import { acceptRequest } from "@/lib/actions";

export const metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";

type Conv = { id: number; name: string | null; vanish: boolean; accepted: boolean; members: { username: string; avatar: string }[]; last: string | null; last_at: string | null; unread: number };

async function listConversations(uid: number) {
  return q<Conv>(`SELECT c.id, c.name, c.vanish, me.accepted,
    (SELECT json_agg(json_build_object('username', u.username, 'avatar', u.avatar)) FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=c.id AND cm.user_id<>$1) AS members,
    (SELECT body FROM messages m WHERE m.conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last,
    (SELECT created_at FROM messages m WHERE m.conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last_at,
    (SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.seen_at IS NULL) AS unread
    FROM conversations c JOIN conversation_members me ON me.conversation_id=c.id AND me.user_id=$1 ORDER BY last_at DESC NULLS LAST`, [uid]);
}

export default async function MessagesPage() {
  const u = await getUser();
  if (!u) redirect("/login");
  const all = await listConversations(u.id);
  const requests = all.filter((c) => !c.accepted);
  const convs = all.filter((c) => c.accepted);
  const Row = ({ c }: { c: Conv }) => (
    <Link href={`/messages/${c.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-elev">
      <div className="relative h-12 w-12 shrink-0">{(c.members ?? []).slice(0, 2).map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.username} src={m.avatar} alt="" className={`absolute rounded-full border-2 border-bg bg-elev ${c.members.length > 1 ? "h-8 w-8" : "h-12 w-12"}`} style={{ left: i * 14, top: i * 14 }} />))}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.name || (c.members ?? []).map((m) => m.username).join(", ")} {c.vanish && <span className="text-xs text-vtext">· vanish</span>}</p>
        <p className={`truncate text-sm ${c.unread ? "font-semibold" : "text-muted"}`}>{c.last ?? "No messages yet"} {c.last_at && <span className="font-mono text-xs text-muted">· {timeAgo(c.last_at)}</span>}</p></div>
      {c.unread > 0 && <span className="animate-pop rounded-full bg-violet px-2 py-0.5 font-mono text-xs text-white">{c.unread}</span>}
    </Link>
  );
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 font-display text-2xl font-extrabold">Messages</h1>
      {requests.length > 0 && <section className="mb-6 rounded-[14px] border border-line p-3">
        <h2 className="mb-2 text-sm font-semibold">Message requests <span className="text-muted">— from people you don&apos;t follow</span></h2>
        {requests.map((c) => <div key={c.id} className="flex items-center gap-2"><div className="flex-1"><Row c={c} /></div>
          <form action={acceptRequest.bind(null, c.id, true)}><button className="text-sm font-semibold text-vtext">Accept</button></form>
          <form action={acceptRequest.bind(null, c.id, false)}><button className="text-sm text-like">Delete</button></form></div>)}
      </section>}
      {convs.length ? convs.map((c) => <Row key={c.id} c={c} />) : <p className="py-10 text-center text-muted">No conversations yet. Message someone from their profile.</p>}
    </div>
  );
}
