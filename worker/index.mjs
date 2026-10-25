// Lumio background worker. Run: node worker/index.mjs (reads DATABASE_URL from .env)
// Jobs: story expiry, vanish-mode cleanup, account-deletion grace period, trending log.
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const jobs = {
  expireStories: () => pool.query("DELETE FROM stories WHERE highlight IS NULL AND expires_at < now()"),
  vanishMessages: () => pool.query("DELETE FROM messages m USING conversations c WHERE c.id=m.conversation_id AND c.vanish AND m.seen_at < now() - interval '15 seconds'"),
  deleteAccounts: async () => {
    const { rows } = await pool.query("SELECT id FROM users WHERE status='pending_deletion' AND created_at < now() - interval '30 days'");
    for (const r of rows) { await pool.query("UPDATE posts SET deleted_at=now() WHERE user_id=$1", [r.id]); await pool.query("UPDATE users SET status='deleted', email='deleted-'||id||'@lumio.invalid' WHERE id=$1", [r.id]); }
    return { rowCount: rows.length };
  },
  computeTrending: () => pool.query("SELECT lower(m[1]) tag, count(*) FROM posts p, regexp_matches(p.caption, '#([A-Za-z0-9_]+)', 'g') m WHERE p.created_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC LIMIT 10"),
};

async function tick() {
  for (const [name, fn] of Object.entries(jobs)) {
    try { const r = await fn(); console.log(`[worker] ${new Date().toISOString()} ${name}: ${r.rowCount ?? 0}`); }
    catch (e) { console.error(`[worker] ${name} failed`, e.message); }
  }
}
tick();
setInterval(tick, 60_000);
