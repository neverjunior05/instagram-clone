import { getUser } from "@/lib/auth";
import { getReels } from "@/lib/data";
import Reels from "@/components/Reels";

export const metadata = { title: "Reels" };
type Props = { searchParams: Promise<{ start?: string }> };

export default async function ReelsPage({ searchParams }: Props) {
  const u = await getUser();
  const reels = await getReels(u?.id ?? 0);
  const start = Number((await searchParams).start);
  const ordered = start ? [...reels.filter((r) => r.id === start), ...reels.filter((r) => r.id !== start)] : reels;
  return <Reels reels={ordered} />;
}
