import { q, VISIBLE, POST_SELECT } from "./sql";

export type PostRow = {
  id: number; user_id: number; kind: string; caption: string; location: string | null;
  media: { type: string; url: string; alt?: string; poster?: string; audio?: string; category?: string }[];
  filter: string; hide_likes: boolean; comments_off: boolean; created_at: string;
  username: string; avatar: string; name: string; like_count: number; comment_count: number; save_count: number; liked: boolean; saved: boolean;
};

const NOT_MUTED = `NOT EXISTS (SELECT 1 FROM blocks m WHERE m.kind='mute' AND m.blocker_id=$1 AND m.blocked_id=u.id)`;

export async function getFeed(viewer: number, mode: "following" | "suggested", cursor: number | null, limit = 8) {
  if (mode === "following") {
    const rows = await q<PostRow>(`${POST_SELECT} WHERE p.deleted_at IS NULL AND p.kind='post' AND ${VISIBLE} AND ${NOT_MUTED}
      AND (p.user_id=$1 OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id=$1 AND status='active'))
      AND ($2::int IS NULL OR p.id < $2) ORDER BY p.id DESC LIMIT $3`, [viewer, cursor, limit]);
    return { posts: rows, next: rows.length === limit ? rows[rows.length - 1].id : null };
  }
  const offset = cursor ?? 0;
  const rows = await q<PostRow>(`SELECT * FROM (${POST_SELECT} WHERE p.deleted_at IS NULL AND p.kind='post' AND u.is_private=false AND ${VISIBLE} AND ${NOT_MUTED}
      AND p.user_id<>$1 AND p.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id=$1)) x
      ORDER BY (like_count + 2*comment_count + 3*save_count + 1) / power(extract(epoch from now()-created_at)/3600 + 2, 1.5) DESC, id DESC
      OFFSET $2 LIMIT $3`, [viewer, offset, limit]);
  return { posts: rows, next: rows.length === limit ? offset + limit : null };
}

export async function getPost(viewer: number, id: number) {
  const rows = await q<PostRow>(`${POST_SELECT} WHERE p.id=$2 AND p.deleted_at IS NULL AND ${VISIBLE}`, [viewer, id]);
  return rows[0] ?? null;
}

export async function getExplore(viewer: number, category: string | null, search: string | null) {
  return q<PostRow>(`${POST_SELECT} WHERE p.deleted_at IS NULL AND u.is_private=false AND ${VISIBLE}
    AND ($2::text IS NULL OR p.media->0->>'category'=$2) AND ($3::text IS NULL OR p.caption ILIKE '%' || $3 || '%' OR u.username ILIKE '%' || $3 || '%')
    ORDER BY (SELECT count(*) FROM likes l WHERE l.post_id=p.id) DESC, p.id DESC LIMIT 60`, [viewer, category, search]);
}

export async function getReels(viewer: number) {
  return q<PostRow>(`${POST_SELECT} WHERE p.deleted_at IS NULL AND p.kind='reel' AND ${VISIBLE} AND ${NOT_MUTED} ORDER BY p.id DESC LIMIT 40`, [viewer]);
}

/** Active stories visible to viewer; close-friends stories only for the owner's close friends. */
export async function getStoryUsers(viewer: number) {
  return q<{ user_id: number; username: string; avatar: string }>(`SELECT DISTINCT ON (u.id) u.id AS user_id, u.username, u.avatar FROM stories s JOIN users u ON u.id=s.user_id
    WHERE s.expires_at > now() AND s.highlight IS NULL AND ${VISIBLE}
    AND NOT EXISTS (SELECT 1 FROM blocks m WHERE m.kind='mute_story' AND m.blocker_id=$1 AND m.blocked_id=u.id)
    AND (s.close_friends=false OR u.id=$1 OR EXISTS (SELECT 1 FROM close_friends c WHERE c.owner_id=u.id AND c.friend_id=$1))
    AND (u.id=$1 OR u.id IN (SELECT following_id FROM follows WHERE follower_id=$1 AND status='active'))
    ORDER BY u.id LIMIT 30`, [viewer]);
}

export async function getStories(viewer: number, username: string) {
  return q<{ id: number; media_url: string; text: string | null; close_friends: boolean; created_at: string; username: string; avatar: string; user_id: number }>(
    `SELECT s.*, u.username, u.avatar FROM stories s JOIN users u ON u.id=s.user_id WHERE u.username=$2 AND s.expires_at > now() AND s.highlight IS NULL AND ${VISIBLE}
     AND (s.close_friends=false OR u.id=$1 OR EXISTS (SELECT 1 FROM close_friends c WHERE c.owner_id=u.id AND c.friend_id=$1)) ORDER BY s.id`, [viewer, username]);
}

export async function getSuggestions(viewer: number) {
  return q<{ id: number; username: string; avatar: string; name: string }>(`SELECT u.id, u.username, u.avatar, u.name FROM users u WHERE u.id<>$1 AND ${VISIBLE.replace("(u.is_private=false OR", "(true OR")}
    AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id=$1) ORDER BY (SELECT count(*) FROM follows f WHERE f.following_id=u.id) DESC LIMIT 6`, [viewer]);
}

export async function getProfile(viewer: number, username: string) {
  const rows = await q<{ id: number; username: string; name: string; avatar: string; bio: string; is_private: boolean; role: string; posts: number; followers: number; following: number; follow_status: string | null; blocked: boolean }>(
    `SELECT u.id, u.username, u.name, u.avatar, u.bio, u.is_private, u.role,
      (SELECT count(*)::int FROM posts p WHERE p.user_id=u.id AND p.deleted_at IS NULL) AS posts,
      (SELECT count(*)::int FROM follows f WHERE f.following_id=u.id AND f.status='active') AS followers,
      (SELECT count(*)::int FROM follows f WHERE f.follower_id=u.id AND f.status='active') AS following,
      (SELECT status FROM follows f WHERE f.follower_id=$1 AND f.following_id=u.id) AS follow_status,
      EXISTS (SELECT 1 FROM blocks b WHERE b.kind='block' AND ((b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=$1))) AS blocked
     FROM users u WHERE u.username=$2 AND u.status='active'`, [viewer, username]);
  return rows[0] ?? null;
}
