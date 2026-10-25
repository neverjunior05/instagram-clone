import Link from "next/link";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/sql";
import { timeAgo } from "@/lib/logic";
import ReportCard from "@/components/ReportCard";

export const metadata = { title: "Moderation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const u = await getUser();
  if (!u || !["admin", "moderator"].includes(u.role)) return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="font-display text-2xl font-extrabold">Moderation portal</h1>
      <p className="mt-2 text-muted">This area is for moderators and admins. Sign in with a staff demo account to open it.</p>
      <Link href="/login" className="mt-6 inline-block rounded-xl bg-violet px-6 py-3 font-semibold text-white">Switch account</Link>
    </div>
  );
  const reports = await q<{ id: number; target_type: string; target_id: number; reason: string; status: string; created_at: string; reporter: string; preview: string | null; thumb: string | null }>(
    `SELECT r.*, ru.username AS reporter,
      CASE WHEN r.target_type IN ('post','reel') THEN (SELECT caption FROM posts WHERE id=r.target_id) WHEN r.target_type='user' THEN (SELECT 'User @' || username FROM users WHERE id=r.target_id) WHEN r.target_type='message' THEN (SELECT body FROM messages WHERE id=r.target_id) END AS preview,
      CASE WHEN r.target_type IN ('post','reel') THEN (SELECT COALESCE(media->0->>'poster', media->0->>'url') FROM posts WHERE id=r.target_id) END AS thumb
     FROM reports r JOIN users ru ON ru.id=r.reporter_id ORDER BY (r.status='open') DESC, r.id DESC LIMIT 50`);
  const daily = await q<{ d: string; uploads: number; likes: number }>(`SELECT to_char(d, 'MM-DD') d,
      (SELECT count(*)::int FROM posts WHERE created_at::date = d::date) uploads,
      (SELECT count(*)::int FROM comments WHERE created_at::date = d::date) likes
    FROM generate_series(now() - interval '13 days', now(), interval '1 day') d`);
  const [kpi] = await q<{ users: number; posts: number; open: number; resolved: number }>("SELECT (SELECT count(*)::int FROM users) users, (SELECT count(*)::int FROM posts WHERE deleted_at IS NULL) posts, (SELECT count(*)::int FROM reports WHERE status='open') open, (SELECT count(*)::int FROM reports WHERE status='resolved') resolved");
  const audit = await q<{ id: number; action: string; detail: string; created_at: string; actor: string }>("SELECT a.*, u.username actor FROM audit_log a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 20");
  const max = Math.max(1, ...daily.map((d) => Math.max(d.uploads, d.likes)));

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <h1 className="font-display text-2xl font-extrabold">Moderation & analytics</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Object.entries(kpi).map(([k, v]) => <div key={k} className="rounded-[14px] border border-line bg-surface p-4"><div className="font-mono text-3xl font-bold">{v}</div><div className="text-sm capitalize text-muted">{k === "open" ? "open reports" : k === "resolved" ? "reports resolved" : k}</div></div>)}</div>
      <section className="rounded-[14px] border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Last 14 days — uploads (violet) & comments (sky)</h2>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Uploads per day: ${daily.map((d) => `${d.d} ${d.uploads}`).join(", ")}`}>
          {daily.map((d, i) => <div key={d.d} className="flex flex-1 flex-col items-center gap-1"><div className="flex h-32 w-full items-end gap-0.5">
            <div className="flex-1 origin-bottom rounded-t bg-violet" style={{ height: `${(d.uploads / max) * 100}%`, animation: `rise .6s ${i * 40}ms both` }} />
            <div className="flex-1 origin-bottom rounded-t bg-sky" style={{ height: `${(d.likes / max) * 100}%`, animation: `rise .6s ${i * 40}ms both` }} /></div>
            <span className="font-mono text-[10px] text-muted">{d.d}</span></div>)}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Reports queue</h2>
        <div className="space-y-3">{reports.map((r) => <ReportCard key={r.id} r={r} />)}</div>
      </section>
      <section className="rounded-[14px] border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Audit log</h2>
        <ul className="space-y-1 text-sm">{audit.map((a) => <li key={a.id} className="flex gap-2"><span className="font-mono text-xs text-muted">{timeAgo(a.created_at)}</span><Link href={`/u/${a.actor}`} className="font-semibold">{a.actor}</Link><span className="text-vtext">{a.action}</span><span className="truncate text-muted">{a.detail}</span></li>)}</ul>
      </section>
    </div>
  );
}
