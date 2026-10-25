import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSuggestions } from "@/lib/data";
import Onboarding from "@/components/Onboarding";

export default async function Page() {
  const u = await getUser();
  if (!u) redirect("/login");
  return <Onboarding username={u.username} avatar={u.avatar} suggestions={await getSuggestions(u.id)} />;
}
