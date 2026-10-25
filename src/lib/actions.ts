"use server";
// All mutations. Every action derives the user from the signed session cookie (never from client input)
// and validates input on the server.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q } from "./sql";
import { getUser, requireUser, setSession, clearSession } from "./auth";
import { hashPassword, verifyPassword } from "./password";
import { rateLimit } from "./logic";
import { allowedMediaHosts, media as mediaCfg } from "@/config/media";

type Result = { error?: string; ok?: boolean };

function safeMediaUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && allowedMediaHosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
  } catch { return false; }
}
function guard(key: string, max: number, ms = 60_000) {
  if (!rateLimit(key, max, ms)) throw new Error("Slow down — rate limit reached. Try again in a minute.");
}
async function notify(userId: number, actorId: number, type: string, postId: number | null = null) {
  if (userId === actorId) return;
  await q("INSERT INTO notifications (user_id,actor_id,type,post_id) VALUES ($1,$2,$3,$4)", [userId, actorId, type, postId]);
}
async function canSeePost(viewer: number, postId: number) {
  const r = await q(`SELECT 1 FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$2 AND p.deleted_at IS NULL AND u.status='active'
    AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.kind='block' AND ((b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=$1)))
    AND (u.is_private=false OR u.id=$1 OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=u.id AND f.status='active'))`, [viewer, postId]);
  return r.length > 0;
}

export async function login(_: Result, fd: FormData): Promise<Result> {
  if (fd.get("website")) return { error: "Invalid submission" }; // honeypot
  const email = String(fd.get("email") || "").trim().toLowerCase();
  if (!rateLimit(`login:${email}`, 8, 60_000)) return { error: "Too many attempts. Wait a minute." };
  const rows = await q<{ id: number; password_hash: string; status: string }>("SELECT id, password_hash, status FROM users WHERE email=$1", [email]);
  if (!rows[0] || !verifyPassword(String(fd.get("password") || ""), rows[0].password_hash)) return { error: "Email or password is incorrect." };
  if (rows[0].status === "suspended") return { error: "This account is suspended. You can appeal via support." };
  await setSession(rows[0].id);
  redirect("/home");
}

/** One-click demo sign-in for the seeded fictional accounts only. */
export async function demoLogin(email: string) {
  if (!["maya@lumio.demo", "ren@lumio.demo", "mod@lumio.demo", "admin@lumio.demo"].includes(email)) throw new Error("Not a demo account");
  const rows = await q<{ id: number }>("UPDATE users SET status='active' WHERE email=$1 RETURNING id", [email]);
  if (!rows[0]) throw new Error("Demo data not seeded yet");
  await setSession(rows[0].id);
  redirect(email.startsWith("mod") || email.startsWith("admin") ? "/admin" : "/home");
}

export async function register(_: Result, fd: FormData): Promise<Result> {
  if (fd.get("website")) return { error: "Invalid submission" };
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (!/^[a-z0-9._]{3,24}$/.test(username)) return { error: "Username: 3–24 chars, letters, numbers, dots, underscores." };
  if (/lumio|admin|moderator|official/.test(username)) return { error: "That username is reserved to prevent impersonation." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!rateLimit("register", 20, 60_000)) return { error: "Too many signups right now." };
  const exists = await q("SELECT 1 FROM users WHERE email=$1 OR username=$2", [email, username]);
  if (exists.length) return { error: "That email or username is taken." };
  const r = await q<{ id: number }>("INSERT INTO users (username,name,email,password_hash,avatar) VALUES ($1,$1,$2,$3,$4) RETURNING id", [username, email, hashPassword(password), mediaCfg.avatar(username)]);
  console.log(`[mock-email] Verify your Lumio account: http://localhost:3000/verify?u=${r[0].id}`);
  await setSession(r[0].id);
  redirect("/onboarding");
}

export async function logout() { await clearSession(); redirect("/"); }

export async function toggleLike(postId: number, force?: boolean) {
  const u = await requireUser();
  guard(`like:${u.id}`, 120);
  if (!(await canSeePost(u.id, postId))) throw new Error("Post unavailable");
  const has = (await q("SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2", [u.id, postId])).length > 0;
  const want = force ?? !has;
  if (want) {
    const ins = await q("INSERT INTO likes VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING post_id", [u.id, postId]); // idempotent
    if (ins.length) { const p = await q<{ user_id: number }>("SELECT user_id FROM posts WHERE id=$1", [postId]); await notify(p[0].user_id, u.id, "like", postId); }
  } else await q("DELETE FROM likes WHERE user_id=$1 AND post_id=$2", [u.id, postId]);
  const c = await q<{ c: number }>("SELECT count(*)::int c FROM likes WHERE post_id=$1", [postId]);
  return { liked: want, count: c[0].c };
}

export async function toggleSave(postId: number, collection = "All posts") {
  const u = await requireUser();
  guard(`save:${u.id}`, 60);
  if (!(await canSeePost(u.id, postId))) throw new Error("Post unavailable");
  const del = await q("DELETE FROM saves WHERE user_id=$1 AND post_id=$2 RETURNING post_id", [u.id, postId]);
  if (del.length) return { saved: false };
  await q("INSERT INTO saves VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [u.id, postId, collection.slice(0, 40) || "All posts"]);
  return { saved: true };
}

export async function addComment(postId: number, body: string, parentId: number | null = null) {
  const u = await requireUser();
  guard(`comment:${u.id}`, 20);
  const text = body.trim().slice(0, 500);
  if (!text) throw new Error("Comment is empty");
  if ((text.match(/https?:\/\//g) || []).length > 2) throw new Error("Too many links");
  if (!(await canSeePost(u.id, postId))) throw new Error("Post unavailable");
  const p = await q<{ user_id: number; comments_off: boolean; hidden_words: string }>("SELECT p.user_id, p.comments_off, u.hidden_words FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1", [postId]);
  if (p[0].comments_off) throw new Error("Comments are turned off");
  const words = (p[0].hidden_words || "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (words.some((w) => text.toLowerCase().includes(w))) return { hidden: true };
  const dup = await q("SELECT 1 FROM comments WHERE user_id=$1 AND body=$2 AND created_at > now() - interval '1 minute'", [u.id, text]);
  if (dup.length) throw new Error("Duplicate comment");
  const r = await q("INSERT INTO comments (post_id,user_id,parent_id,body) VALUES ($1,$2,$3,$4) RETURNING id, body, created_at, parent_id, pinned", [postId, u.id, parentId, text]);
  await notify(p[0].user_id, u.id, "comment", postId);
  for (const m of text.matchAll(/@([a-z0-9._]{3,24})/g)) {
    const t = await q<{ id: number }>("SELECT id FROM users WHERE username=$1", [m[1]]);
    if (t[0]) await notify(t[0].id, u.id, "mention", postId);
  }
  return { comment: { ...r[0], username: u.username, avatar: u.avatar } };
}

export async function pinComment(commentId: number) {
  const u = await requireUser();
  const c = await q<{ post_id: number; pinned: boolean }>("SELECT c.post_id, c.pinned FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=$1 AND p.user_id=$2", [commentId, u.id]);
  if (!c[0]) throw new Error("Only the author can pin");
  await q("UPDATE comments SET pinned=$2 WHERE id=$1", [commentId, !c[0].pinned]);
  revalidatePath(`/p/${c[0].post_id}`);
}

export async function toggleFollow(targetId: number) {
  const u = await requireUser();
  guard(`follow:${u.id}`, 40);
  if (targetId === u.id) throw new Error("Can't follow yourself");
  const blocked = await q("SELECT 1 FROM blocks WHERE kind='block' AND ((blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1))", [u.id, targetId]);
  if (blocked.length) throw new Error("Unavailable");
  const del = await q("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2 RETURNING status", [u.id, targetId]);
  if (del.length) { revalidatePath("/u/[username]", "page"); return { status: null }; }
  const t = await q<{ is_private: boolean }>("SELECT is_private FROM users WHERE id=$1", [targetId]);
  const status = t[0]?.is_private ? "pending" : "active";
  await q("INSERT INTO follows VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [u.id, targetId, status]);
  await notify(targetId, u.id, status === "pending" ? "follow_request" : "follow");
  revalidatePath("/u/[username]", "page");
  return { status };
}

export async function respondFollow(followerId: number, accept: boolean) {
  const u = await requireUser();
  if (accept) await q("UPDATE follows SET status='active' WHERE follower_id=$1 AND following_id=$2", [followerId, u.id]);
  else await q("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2 AND status='pending'", [followerId, u.id]);
  revalidatePath("/notifications");
}

export type NewPost = { kind: "post" | "reel"; media: { url: string; alt: string; type: "image" | "video"; poster?: string }[]; caption: string; location?: string; filter?: string; hideLikes?: boolean; commentsOff?: boolean; category?: string };
export async function createPost(input: NewPost): Promise<Result & { id?: number }> {
  const u = await requireUser();
  if (!rateLimit(`post:${u.id}`, 10, 60 * 60_000)) return { error: "Posting limit reached (10/hour)." };
  if (!Array.isArray(input.media) || input.media.length < 1 || input.media.length > 10) return { error: "Add 1–10 media items." };
  for (const m of input.media) if (!safeMediaUrl(m.url) || (m.poster && !safeMediaUrl(m.poster))) return { error: `Media host not allowed: ${m.url.slice(0, 60)}. Allowed: ${allowedMediaHosts.join(", ")}` };
  const caption = String(input.caption || "").slice(0, 2200);
  const media = input.media.map((m) => ({ type: m.type === "video" ? "video" : "image", url: m.url, alt: String(m.alt || "").slice(0, 200), poster: m.poster, category: input.category || "Photography" }));
  const r = await q<{ id: number }>("INSERT INTO posts (user_id,kind,caption,location,media,filter,hide_likes,comments_off) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
    [u.id, input.kind === "reel" ? "reel" : "post", caption, input.location?.slice(0, 80) || null, JSON.stringify(media), String(input.filter || "none").slice(0, 20), !!input.hideLikes, !!input.commentsOff]);
  revalidatePath("/home");
  return { ok: true, id: r[0].id };
}

export async function updateCaption(postId: number, caption: string) {
  const u = await requireUser();
  await q("UPDATE posts SET caption=$3 WHERE id=$1 AND user_id=$2", [postId, u.id, caption.slice(0, 2200)]);
  revalidatePath(`/p/${postId}`);
}

export async function deletePost(postId: number) {
  const u = await requireUser();
  await q("UPDATE posts SET deleted_at=now() WHERE id=$1 AND user_id=$2", [postId, u.id]);
  redirect(`/u/${u.username}`);
}

export async function createStory(url: string, text: string, closeFriends: boolean): Promise<Result> {
  const u = await requireUser();
  if (!safeMediaUrl(url)) return { error: "Use an https image URL from an allowed host." };
  await q("INSERT INTO stories (user_id,media_url,text,close_friends,expires_at) VALUES ($1,$2,$3,$4, now() + interval '24 hours')", [u.id, url, text.slice(0, 120), closeFriends]);
  revalidatePath("/home");
  return { ok: true };
}

export async function saveHighlight(storyId: number, name: string) {
  const u = await requireUser();
  await q("INSERT INTO stories (user_id,media_url,text,highlight,expires_at) SELECT user_id, media_url, text, $3, now() FROM stories WHERE id=$1 AND user_id=$2", [storyId, u.id, name.slice(0, 24) || "Highlights"]);
}

export async function replyToStory(storyOwnerId: number, text: string) {
  const u = await requireUser();
  const cid = await openConversation(storyOwnerId);
  await sendMessage(cid, `↩︎ Replied to your story: ${text}`);
  await notify(storyOwnerId, u.id, "story_reply");
}

export async function openConversation(otherId: number) {
  const u = await requireUser();
  const blocked = await q("SELECT 1 FROM blocks WHERE kind='block' AND ((blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1))", [u.id, otherId]);
  if (blocked.length) throw new Error("Unavailable");
  const ex = await q<{ conversation_id: number }>(`SELECT a.conversation_id FROM conversation_members a JOIN conversation_members b ON a.conversation_id=b.conversation_id
    WHERE a.user_id=$1 AND b.user_id=$2 AND (SELECT count(*) FROM conversation_members c WHERE c.conversation_id=a.conversation_id)=2 LIMIT 1`, [u.id, otherId]);
  if (ex[0]) return ex[0].conversation_id;
  const follows = await q("SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=$1 AND status='active'", [u.id, otherId]);
  const c = await q<{ id: number }>("INSERT INTO conversations DEFAULT VALUES RETURNING id");
  await q("INSERT INTO conversation_members (conversation_id,user_id,accepted) VALUES ($1,$2,true),($1,$3,$4)", [c[0].id, u.id, otherId, follows.length > 0]);
  if (!follows.length) await notify(otherId, u.id, "dm_request");
  return c[0].id;
}

async function assertMember(cid: number, uid: number) {
  const m = await q("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2", [cid, uid]);
  if (!m.length) throw new Error("Not a member");
}

export async function sendMessage(cid: number, body: string) {
  const u = await requireUser();
  guard(`msg:${u.id}`, 40);
  await assertMember(cid, u.id);
  const text = body.trim().slice(0, 1000);
  if (!text) throw new Error("Empty");
  const others = await q<{ user_id: number }>("SELECT user_id FROM conversation_members WHERE conversation_id=$1 AND user_id<>$2", [cid, u.id]);
  for (const o of others) {
    const b = await q("SELECT 1 FROM blocks WHERE kind='block' AND ((blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1))", [u.id, o.user_id]);
    if (b.length) throw new Error("You can't message this account.");
  }
  await q("UPDATE conversation_members SET accepted=true WHERE conversation_id=$1 AND user_id=$2", [cid, u.id]);
  const r = await q("INSERT INTO messages (conversation_id,sender_id,body) VALUES ($1,$2,$3) RETURNING *", [cid, u.id, text]);
  return r[0];
}

export async function unsendMessage(id: number) {
  const u = await requireUser();
  await q("DELETE FROM messages WHERE id=$1 AND sender_id=$2", [id, u.id]);
}

export async function setVanish(cid: number, on: boolean) {
  const u = await requireUser();
  await assertMember(cid, u.id);
  await q("UPDATE conversations SET vanish=$2 WHERE id=$1", [cid, on]);
}

export async function acceptRequest(cid: number, accept: boolean) {
  const u = await requireUser();
  if (accept) await q("UPDATE conversation_members SET accepted=true WHERE conversation_id=$1 AND user_id=$2", [cid, u.id]);
  else await q("DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2", [cid, u.id]);
  revalidatePath("/messages");
}

export async function report(targetType: string, targetId: number, reason: string): Promise<Result> {
  const u = await requireUser();
  if (!rateLimit(`report:${u.id}`, 10, 60 * 60_000)) return { error: "Report limit reached." };
  if (!["post", "reel", "story", "comment", "user", "message"].includes(targetType)) return { error: "Invalid target" };
  await q("INSERT INTO reports (reporter_id,target_type,target_id,reason) VALUES ($1,$2,$3,$4)", [u.id, targetType, targetId, reason.slice(0, 200)]);
  return { ok: true };
}

/** kind: block | mute | mute_story | restrict. Blocking also removes follows both ways. */
export async function toggleRelation(targetId: number, kind: string) {
  const u = await requireUser();
  if (!["block", "mute", "mute_story", "restrict"].includes(kind) || targetId === u.id) throw new Error("Invalid");
  const del = await q("DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2 AND kind=$3 RETURNING kind", [u.id, targetId, kind]);
  if (del.length) return { on: false };
  await q("INSERT INTO blocks VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [u.id, targetId, kind]);
  if (kind === "block") await q("DELETE FROM follows WHERE (follower_id=$1 AND following_id=$2) OR (follower_id=$2 AND following_id=$1)", [u.id, targetId]);
  revalidatePath("/home");
  return { on: true };
}

export async function toggleCloseFriend(friendId: number) {
  const u = await requireUser();
  const del = await q("DELETE FROM close_friends WHERE owner_id=$1 AND friend_id=$2 RETURNING friend_id", [u.id, friendId]);
  if (!del.length) await q("INSERT INTO close_friends VALUES ($1,$2) ON CONFLICT DO NOTHING", [u.id, friendId]);
  revalidatePath("/settings");
  return { on: !del.length };
}

export async function updateProfile(fd: FormData) {
  const u = await requireUser();
  const name = String(fd.get("name") || u.name).slice(0, 50);
  const bio = String(fd.get("bio") || "").slice(0, 150);
  const isPrivate = fd.get("is_private") === "on";
  const hidden = String(fd.get("hidden_words") || "").slice(0, 500);
  await q("UPDATE users SET name=$2, bio=$3, is_private=$4, hidden_words=$5 WHERE id=$1", [u.id, name, bio, isPrivate, hidden]);
  // Switching to public auto-approves pending requests
  if (!isPrivate) await q("UPDATE follows SET status='active' WHERE following_id=$1 AND status='pending'", [u.id]);
  revalidatePath("/settings");
}

export async function deleteAccount() {
  const u = await requireUser();
  await q("UPDATE users SET status='pending_deletion' WHERE id=$1", [u.id]);
  await clearSession();
  redirect("/");
}

export async function markNotificationsRead() {
  const u = await getUser();
  if (u) await q("UPDATE notifications SET read=true WHERE user_id=$1", [u.id]);
}

export async function moderate(reportId: number, action: "dismiss" | "remove" | "warn" | "suspend", note: string) {
  const u = await requireUser();
  if (!["moderator", "admin"].includes(u.role)) throw new Error("Forbidden");
  const r = await q<{ target_type: string; target_id: number; reason: string }>("SELECT target_type, target_id, reason FROM reports WHERE id=$1", [reportId]);
  if (!r[0]) throw new Error("Not found");
  const reason = `${r[0].reason}${note ? ` — ${note}` : ""}`;
  if (action === "remove" && ["post", "reel"].includes(r[0].target_type)) await q("UPDATE posts SET deleted_at=now(), removed_reason=$2 WHERE id=$1", [r[0].target_id, reason]);
  if (action === "suspend") {
    const target = r[0].target_type === "user" ? r[0].target_id : (await q<{ user_id: number }>("SELECT user_id FROM posts WHERE id=$1", [r[0].target_id]))[0]?.user_id;
    if (target) await q("UPDATE users SET status='suspended' WHERE id=$1 AND role='member'", [target]);
  }
  await q("UPDATE reports SET status='resolved', resolution=$2 WHERE id=$1", [reportId, action]);
  await q("INSERT INTO audit_log (actor_id,action,detail) VALUES ($1,$2,$3)", [u.id, `report.${action}`, `report #${reportId} (${r[0].target_type} ${r[0].target_id}): ${reason}`]);
  revalidatePath("/admin");
}
