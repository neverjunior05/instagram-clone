import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import CreateFlow from "@/components/CreateFlow";

export const metadata = { title: "Create", robots: { index: false } };
type Props = { searchParams: Promise<{ story?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  if (!(await getUser())) redirect("/login");
  return <CreateFlow initialMode={(await searchParams).story ? "story" : "post"} />;
}
