import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import Chat from "@/components/Chat";

export const metadata = { title: "Chat", robots: { index: false } };
type Props = { params: Promise<{ id: string }> };

export default async function ChatPage({ params }: Props) {
  const u = await getUser();
  if (!u) redirect("/login");
  const id = Number((await params).id);
  const conv = await q<{ name: string | null; vanish: boolean }>("SELECT c.name, c.vanish FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=$2 WHERE c.id=$1", [id, u.id]);
  if (!conv[0]) notFound();
  const members = await q<{ id: number; username: string; avatar: string; last_read_at: string | null }>("SELECT u.id, u.username, u.avatar, m.last_read_at FROM conversation_members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2", [id, u.id]);
  return <Chat id={id} me={u.id} title={conv[0].name || members.map((m) => m.username).join(", ")} members={members} initialVanish={conv[0].vanish} />;
}
