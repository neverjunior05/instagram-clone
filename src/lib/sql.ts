import { pool } from "@/db";
import { ensureDb } from "./bootstrap";

/** Parameterized query helper (never interpolate user input). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureDb();
  const r = await pool.query(text, params);
  return r.rows as T[];
}

/** SQL fragment: can viewer ($1) see content authored by alias `u`? Enforces block, privacy, suspension. */
export const VISIBLE = `u.status='active'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.kind='block' AND ((b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=$1)))
  AND (u.is_private=false OR u.id=$1 OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=u.id AND f.status='active'))`;

export const POST_SELECT = `SELECT p.id, p.user_id, p.kind, p.caption, p.location, p.media, p.filter, p.hide_likes, p.comments_off, p.created_at,
  u.username, u.avatar, u.name,
  (SELECT count(*)::int FROM likes l WHERE l.post_id=p.id) AS like_count,
  (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count,
  (SELECT count(*)::int FROM saves s WHERE s.post_id=p.id) AS save_count,
  EXISTS (SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,
  EXISTS (SELECT 1 FROM saves s WHERE s.post_id=p.id AND s.user_id=$1) AS saved
  FROM posts p JOIN users u ON u.id=p.user_id`;
