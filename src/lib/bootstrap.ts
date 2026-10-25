// Creates tables if missing and seeds fictional demo data on first run.
import { pool } from "@/db";
import { hashPassword } from "./password";
import { media } from "@/config/media";

const DDL = `
CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, username text NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL, avatar text NOT NULL, bio text DEFAULT '', role text NOT NULL DEFAULT 'member', status text NOT NULL DEFAULT 'active', is_private boolean NOT NULL DEFAULT false, hidden_words text DEFAULT '', created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS follows (follower_id integer NOT NULL, following_id integer NOT NULL, status text NOT NULL DEFAULT 'active', created_at timestamp DEFAULT now(), PRIMARY KEY (follower_id, following_id));
CREATE TABLE IF NOT EXISTS posts (id serial PRIMARY KEY, user_id integer NOT NULL, kind text NOT NULL DEFAULT 'post', caption text DEFAULT '', location text, media jsonb NOT NULL, filter text DEFAULT 'none', hide_likes boolean DEFAULT false, comments_off boolean DEFAULT false, deleted_at timestamp, removed_reason text, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS likes (user_id integer NOT NULL, post_id integer NOT NULL, PRIMARY KEY (user_id, post_id));
CREATE TABLE IF NOT EXISTS saves (user_id integer NOT NULL, post_id integer NOT NULL, collection text NOT NULL DEFAULT 'All posts', PRIMARY KEY (user_id, post_id));
CREATE TABLE IF NOT EXISTS comments (id serial PRIMARY KEY, post_id integer NOT NULL, user_id integer NOT NULL, parent_id integer, body text NOT NULL, pinned boolean DEFAULT false, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS stories (id serial PRIMARY KEY, user_id integer NOT NULL, media_url text NOT NULL, text text, close_friends boolean DEFAULT false, highlight text, expires_at timestamp NOT NULL, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS close_friends (owner_id integer NOT NULL, friend_id integer NOT NULL, PRIMARY KEY (owner_id, friend_id));
CREATE TABLE IF NOT EXISTS conversations (id serial PRIMARY KEY, name text, vanish boolean DEFAULT false, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS conversation_members (conversation_id integer NOT NULL, user_id integer NOT NULL, accepted boolean DEFAULT true, last_read_at timestamp, PRIMARY KEY (conversation_id, user_id));
CREATE TABLE IF NOT EXISTS messages (id serial PRIMARY KEY, conversation_id integer NOT NULL, sender_id integer NOT NULL, body text NOT NULL, seen_at timestamp, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id serial PRIMARY KEY, user_id integer NOT NULL, actor_id integer NOT NULL, type text NOT NULL, post_id integer, read boolean DEFAULT false, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS blocks (blocker_id integer NOT NULL, blocked_id integer NOT NULL, kind text NOT NULL DEFAULT 'block', PRIMARY KEY (blocker_id, blocked_id, kind));
CREATE TABLE IF NOT EXISTS reports (id serial PRIMARY KEY, reporter_id integer NOT NULL, target_type text NOT NULL, target_id integer NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'open', resolution text, created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (id serial PRIMARY KEY, actor_id integer NOT NULL, action text NOT NULL, detail text, created_at timestamp DEFAULT now());
CREATE INDEX IF NOT EXISTS likes_post_idx ON likes(post_id);
CREATE INDEX IF NOT EXISTS saves_post_idx ON saves(post_id);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id, id DESC);
CREATE INDEX IF NOT EXISTS posts_kind_idx ON posts(kind, id DESC);
CREATE INDEX IF NOT EXISTS stories_user_idx ON stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id, id DESC);
`;

const FIRST = ["Nova", "Kai", "Iris", "Juno", "Theo", "Lark", "Mika", "Orin", "Sage", "Remy", "Tali", "Vesper", "Wren", "Zuri", "Ezra", "Fen", "Gala", "Hollis", "Ines", "Jory", "Koa", "Lumi", "Milo", "Nell", "Oaklee", "Pip", "Quill", "Rowan", "Sol", "Tamsin", "Uma", "Vale", "Wilder", "Xan", "Yara", "Zephyr"];
const THEMES = ["Photography", "Travel", "Food", "Art", "Fitness", "Pets", "Tech"];
const CAPTIONS: Record<string, string[]> = {
  Photography: ["Chasing soft light again #goldenhour #filmphotography", "Shadows doing all the work today #streetphotography", "Shot on a borrowed lens, kept the mood #35mm"],
  Travel: ["Trail views that made the climb worth it #mountaintrail #travel", "Postcard from somewhere quiet #wanderlust", "Packed light, came back heavy with memories #travelflatlay"],
  Food: ["Latte art attempt number 42 #latteart #coffee", "Sunday brunch, no notes #foodie", "Homemade noodles, slightly uneven, fully delicious #cooking"],
  Art: ["Minimal lines, maximal calm #architecture #minimal", "New sketchbook spread #art", "Color study in violet and gold #design"],
  Fitness: ["Morning run before the city wakes #fitness", "Rest day stretch session #wellness", "New personal best, tiny celebration #running"],
  Pets: ["Official office supervisor #petsofLumio", "Nap champion of the year #catsofLumio", "Zoomies at the park #dogsofLumio"],
  Tech: ["Desk setup refresh #setup #tech", "Neon city night walk #neon #citylights", "Soldered my first keyboard #maker"],
};
const COMMENTS = ["This is stunning ✨", "The colors!!", "Where is this?", "Saving this for inspo", "Love the composition", "Okay this made my day", "Need the recipe 🙏", "So calm, so good", "Frame-worthy"];

let ready: Promise<void> | null = null;
export function ensureDb() {
  if (!ready) ready = init().catch((e) => { ready = null; throw e; });
  return ready;
}

async function init() {
  await pool.query(DDL);
  const { rows } = await pool.query("SELECT count(*)::int AS c FROM users");
  if (rows[0].c > 0) return;
  await pool.query("SELECT pg_advisory_lock(42)");
  try {
    const again = await pool.query("SELECT count(*)::int AS c FROM users");
    if (again.rows[0].c === 0) await seed();
  } finally {
    await pool.query("SELECT pg_advisory_unlock(42)");
  }
}

function rnd<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

async function seed() {
  const hash = hashPassword("lumio-demo");
  const people = [
    { username: "maya.frames", name: "Maya Demo", email: "maya@lumio.demo", role: "member", priv: false },
    { username: "ren.private", name: "Ren Demo", email: "ren@lumio.demo", role: "member", priv: true },
    { username: "mod.lumio", name: "Moderator Demo", email: "mod@lumio.demo", role: "moderator", priv: false },
    { username: "admin.lumio", name: "Admin Demo", email: "admin@lumio.demo", role: "admin", priv: false },
    ...FIRST.map((f, i) => ({ username: `${f.toLowerCase()}.${rnd(["shoots", "eats", "draws", "roams", "lifts", "codes", "paws"])}${i}`, name: `${f} (demo)`, email: `${f.toLowerCase()}@lumio.demo`, role: "member", priv: i % 13 === 5 })),
  ];
  const ids: number[] = [];
  for (const p of people) {
    const r = await pool.query(
      "INSERT INTO users (username,name,email,password_hash,avatar,bio,role,is_private,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() - (random()*interval '60 days')) RETURNING id",
      [p.username, p.name, p.email, hash, media.avatar(p.username), `Fictional ${rnd(THEMES).toLowerCase()} lover · demo account`, p.role, p.priv],
    );
    ids.push(r.rows[0].id);
  }
  // Follows: everyone follows ~12 random accounts; a few pending requests to private accounts
  for (const a of ids) {
    const targets = new Set<number>();
    while (targets.size < 12) { const b = rnd(ids); if (b !== a) targets.add(b); }
    for (const b of targets) await pool.query("INSERT INTO follows VALUES ($1,$2,'active', now()) ON CONFLICT DO NOTHING", [a, b]);
  }
  await pool.query("INSERT INTO follows VALUES ($1,$2,'active',now()) ON CONFLICT (follower_id,following_id) DO UPDATE SET status='active'", [ids[0], ids[1]]);
  await pool.query("INSERT INTO follows VALUES ($1,$2,'pending',now()) ON CONFLICT (follower_id,following_id) DO UPDATE SET status='pending'", [ids[6], ids[1]]);

  // Posts and reels, inserted oldest-first so id order == time order
  type P = { user: number; kind: string; caption: string; media: unknown; at: Date; loc: string | null };
  const list: P[] = [];
  for (let i = 0; i < 200; i++) {
    const theme = rnd(THEMES);
    const n = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 3) : 1;
    list.push({
      user: rnd(ids), kind: "post", caption: rnd(CAPTIONS[theme]),
      media: Array.from({ length: n }, (_, k) => ({ type: "image", url: media.photo(`p${i}-${k}`), alt: `Demo ${theme.toLowerCase()} photo ${k + 1}`, category: theme })),
      at: new Date(Date.now() - Math.random() * 21 * 864e5), loc: Math.random() < 0.4 ? rnd(["Harbor District", "Old Town", "Pine Ridge", "Riverside Market"]) : null,
    });
  }
  for (let i = 0; i < 40; i++) {
    const theme = rnd(THEMES);
    list.push({ user: rnd(ids), kind: "reel", caption: rnd(CAPTIONS[theme]), media: [{ type: "video", url: media.reels[i % media.reels.length], poster: media.photo(`r${i}`, 720, 1280), alt: `Demo reel ${i + 1}`, audio: rnd(media.audio), category: theme }], at: new Date(Date.now() - Math.random() * 14 * 864e5), loc: null });
  }
  list.sort((a, b) => a.at.getTime() - b.at.getTime());
  const postIds: number[] = [];
  for (const p of list) {
    const r = await pool.query("INSERT INTO posts (user_id,kind,caption,location,media,created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [p.user, p.kind, p.caption, p.loc, JSON.stringify(p.media), p.at]);
    postIds.push(r.rows[0].id);
  }
  // Likes, saves, comments (bulk via SQL for speed)
  await pool.query("INSERT INTO likes SELECT u.id, p.id FROM users u CROSS JOIN posts p WHERE random() < 0.18 ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO saves (user_id,post_id,collection) SELECT u.id, p.id, (ARRAY['All posts','Travel ideas','Recipes'])[1+floor(random()*3)] FROM users u CROSS JOIN posts p WHERE random() < 0.03 ON CONFLICT DO NOTHING");
  for (let i = 0; i < 360; i++) {
    const post = rnd(postIds);
    const r = await pool.query("INSERT INTO comments (post_id,user_id,body,created_at) VALUES ($1,$2,$3, now() - random()*interval '10 days') RETURNING id", [post, rnd(ids), rnd(COMMENTS)]);
    if (i % 4 === 0) await pool.query("INSERT INTO comments (post_id,user_id,parent_id,body) VALUES ($1,$2,$3,$4)", [post, rnd(ids), r.rows[0].id, "Agreed! 💜"]);
    if (i % 25 === 0) await pool.query("UPDATE comments SET pinned=true WHERE id=$1", [r.rows[0].id]);
  }
  // Stories (some expire in minutes, some close-friends only) + highlights
  for (let i = 0; i < 30; i++) {
    const mins = i < 5 ? 3 + i * 2 : 60 * (2 + Math.random() * 20);
    await pool.query("INSERT INTO stories (user_id,media_url,text,close_friends,expires_at) VALUES ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval)", [ids[i % ids.length], media.photo(`s${i}`, 720, 1280), rnd(["Good morning ☀️", "Guess where 👀", "New post up!", "Poll: coffee or tea?", null]), i % 7 === 3, String(Math.round(mins))]);
  }
  const hl = ["Travel", "Food", "Studio", "Pets", "Summer", "Friends", "Hikes", "Coffee"];
  for (let i = 0; i < 8; i++) await pool.query("INSERT INTO stories (user_id,media_url,text,highlight,expires_at) VALUES ($1,$2,$3,$4, now() - interval '1 day')", [ids[i % 4], media.photo(`h${i}`, 720, 1280), hl[i], hl[i]]);
  await pool.query("INSERT INTO close_friends VALUES ($1,$2),($1,$3) ON CONFLICT DO NOTHING", [ids[0], ids[4], ids[5]]);

  // Conversations: 6 chats incl. a message request and a vanish chat
  const convs: { members: number[]; vanish?: boolean; request?: boolean; name?: string }[] = [
    { members: [ids[0], ids[4]] }, { members: [ids[0], ids[5]] }, { members: [ids[0], ids[6], ids[7], ids[8]], name: "Weekend hike crew" },
    { members: [ids[0], ids[9]], vanish: true }, { members: [ids[20], ids[0]], request: true }, { members: [ids[1], ids[0]] },
  ];
  const lines = ["hey! loved your latest post", "thank you!! it was such a good day", "we should shoot together sometime", "yes! golden hour on Saturday?", "deal 📸"];
  for (const c of convs) {
    const r = await pool.query("INSERT INTO conversations (name,vanish) VALUES ($1,$2) RETURNING id", [c.name ?? null, !!c.vanish]);
    const cid = r.rows[0].id;
    for (const [k, m] of c.members.entries()) await pool.query("INSERT INTO conversation_members (conversation_id,user_id,accepted) VALUES ($1,$2,$3)", [cid, m, !(c.request && k === 1)]);
    const count = c.request ? 1 : lines.length;
    for (let k = 0; k < count; k++) await pool.query("INSERT INTO messages (conversation_id,sender_id,body,created_at) VALUES ($1,$2,$3, now() - ($4 || ' minutes')::interval)", [cid, c.members[k % c.members.length], lines[k], String((count - k) * 7)]);
  }
  // Notifications of every type for Maya
  const types = ["like", "like", "like", "comment", "mention", "tag", "follow", "follow_request", "story_reply", "dm_request"];
  for (let i = 0; i < 30; i++) await pool.query("INSERT INTO notifications (user_id,actor_id,type,post_id,created_at) VALUES ($1,$2,$3,$4, now() - random()*interval '3 days')", [ids[0], ids[4 + (i % 30)], types[i % types.length], postIds[postIds.length - 1 - (i % 3)]]);
  // Blocks / mutes / restricts and reports
  await pool.query("INSERT INTO blocks VALUES ($1,$2,'block'),($1,$3,'mute'),($1,$4,'restrict') ON CONFLICT DO NOTHING", [ids[0], ids[30], ids[31], ids[32]]);
  const reasons = ["Spam", "Harassment", "Nudity", "Misinformation", "Impersonation"];
  for (let i = 0; i < 6; i++) await pool.query("INSERT INTO reports (reporter_id,target_type,target_id,reason,status,created_at) VALUES ($1,$2,$3,$4,$5, now() - random()*interval '7 days')", [ids[10 + i], i % 3 === 0 ? "user" : "post", i % 3 === 0 ? ids[25 + i] : postIds[i * 7], reasons[i % 5], i < 4 ? "open" : "resolved"]);
  await pool.query("INSERT INTO audit_log (actor_id,action,detail) VALUES ($1,'seed','Initial fictional demo data created')", [ids[3]]);
}
