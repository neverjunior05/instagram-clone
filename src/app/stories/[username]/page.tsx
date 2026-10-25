import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getStories, getStoryUsers } from "@/lib/data";
import StoryViewer from "@/components/StoryViewer";

export const metadata = { title: "Stories", robots: { index: false } };
type Props = { params: Promise<{ username: string }> };

export default async function StoryPage({ params }: Props) {
  const u = await getUser();
  if (!u) redirect("/login");
  const username = decodeURIComponent((await params).username);
  const [stories, ring] = await Promise.all([getStories(u.id, username), getStoryUsers(u.id)]);
  const idx = ring.findIndex((r) => r.username === username);
  const nextUser = idx >= 0 ? ring[idx + 1] : undefined;
  return <StoryViewer stories={stories} username={username} avatar={stories[0]?.avatar ?? ""} ownerId={stories[0]?.user_id ?? 0} isOwner={stories[0]?.user_id === u.id} nextHref={nextUser ? `/stories/${nextUser.username}` : null} />;
}
