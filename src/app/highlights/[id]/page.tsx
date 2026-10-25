import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q, VISIBLE } from "@/lib/sql";
import StoryViewer from "@/components/StoryViewer";

type Props = { params: Promise<{ id: string }> };

export default async function HighlightPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const u = await getUser();
  const viewer = u?.id ?? 0;
  const first = await q<{ user_id: number; highlight: string; username: string; avatar: string }>(`SELECT s.user_id, s.highlight, u.username, u.avatar FROM stories s JOIN users u ON u.id=s.user_id WHERE s.id=$2 AND s.highlight IS NOT NULL AND ${VISIBLE}`, [viewer, id]);
  if (!first[0]) notFound();
  const items = await q<{ id: number; media_url: string; text: string | null; close_friends: boolean; created_at: string }>("SELECT id, media_url, text, close_friends, created_at FROM stories WHERE user_id=$1 AND highlight=$2 ORDER BY id", [first[0].user_id, first[0].highlight]);
  return <StoryViewer stories={items} username={first[0].username} avatar={first[0].avatar} ownerId={first[0].user_id} isOwner={false} nextHref={null} />;
}
