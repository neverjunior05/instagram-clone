import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import { updateProfile, logout, deleteAccount, toggleCloseFriend, toggleRelation } from "@/lib/actions";
import Appearance from "@/components/Appearance";

export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const u = await getUser();
  if (!u) redirect("/login");
  const [me] = await q<{ hidden_words: string }>("SELECT hidden_words FROM users WHERE id=$1", [u.id]);
  const cf = await q<{ id: number; username: string; avatar: string }>("SELECT u.id, u.username, u.avatar FROM close_friends c JOIN users u ON u.id=c.friend_id WHERE c.owner_id=$1", [u.id]);
  const rel = await q<{ id: number; username: string; kind: string }>("SELECT u.id, u.username, b.kind FROM blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.kind", [u.id]);
  const card = "rounded-[14px] border border-line bg-surface p-5";
  const input = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>
      <form action={updateProfile} className={`${card} space-y-3`}>
        <h2 className="font-semibold">Profile & privacy</h2>
        <label className="block text-sm">Name<input name="name" defaultValue={u.name} maxLength={50} className={input} /></label>
        <label className="block text-sm">Bio<textarea name="bio" defaultValue={u.bio ?? ""} maxLength={150} className={input} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_private" defaultChecked={u.is_private} /> Private account (only approved followers see your posts; switching to public approves pending requests)</label>
        <label className="block text-sm">Hidden words (comma separated — comments containing them are hidden)<input name="hidden_words" defaultValue={me?.hidden_words ?? ""} className={input} /></label>
        <button className="rounded-xl bg-violet px-5 py-2 font-semibold text-white">Save</button>
      </form>
      <Appearance />
      <section className={card}>
        <h2 className="mb-3 font-semibold">Close friends</h2>
        {cf.length ? <ul className="space-y-2">{cf.map((f) => <li key={f.id} className="flex items-center gap-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.avatar} alt="" className="h-8 w-8 rounded-full" /><span className="flex-1">{f.username}</span>
          <form action={async () => { "use server"; await toggleCloseFriend(f.id); }}><button className="text-like">Remove</button></form></li>)}</ul> : <p className="text-sm text-muted">Add close friends from a profile’s ••• menu.</p>}
      </section>
      <section className={card}>
        <h2 className="mb-3 font-semibold">Blocked, muted & restricted</h2>
        {rel.length ? <ul className="space-y-2">{rel.map((r) => <li key={r.kind + r.id} className="flex items-center justify-between text-sm"><span>{r.username} <span className="text-xs text-muted">({r.kind.replace("_", " ")})</span></span>
          <form action={async () => { "use server"; await toggleRelation(r.id, r.kind); }}><button className="text-vtext">Undo</button></form></li>)}</ul> : <p className="text-sm text-muted">No one.</p>}
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Your data</h2>
        <a href="/api/export" className="inline-block rounded-xl bg-elev px-4 py-2 text-sm">Download my data (JSON)</a>
        <form action={deleteAccount}><button className="text-sm text-like">Delete account (30-day grace period — log in again to cancel)</button></form>
        <form action={logout}><button className="text-sm text-muted">Log out</button></form>
      </section>
    </div>
  );
}
