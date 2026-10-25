# Lumio — share the light you see

A cinematic, dark-first photo & video sharing demo: posts and carousels, Reels, 24-hour Stories, DMs, Explore, profiles, notifications, and moderation.

> **Disclaimer.** Lumio is an independent demo and learning project inspired by the general category of photo-sharing apps. It is **not** affiliated with, endorsed by, or a copy of any existing company's product, and uses no third-party names, logos, icons or trademarks. All seeded users, posts, videos and messages are **fictional test data**.

![Screenshot placeholder](docs/screenshot-feed.png) ![GIF placeholder](docs/reels.gif)

## What's actually built here
The full brief was very large. This version is a working, scaled-down implementation of it on **Next.js 16 (App Router) + PostgreSQL (Drizzle schema, parameterized SQL through `pg`)**, with **no extra runtime dependencies**. Where it differs from the original brief:

| Brief | This implementation |
|---|---|
| Prisma/SQLite | Drizzle schema (`src/db/schema.ts`) + idempotent DDL bootstrap (`src/lib/bootstrap.ts`) on Postgres |
| Auth.js + Google | Signed HMAC session cookie + scrypt password hashes. The Google button is shown but disabled until keys exist. Verification/reset emails are logged to the console |
| Socket.IO | 1.5s polling via `/api/messages/[id]`, with typing, receipts and vanish mode. This is where Socket.IO/SSE would plug in |
| Framer Motion / GSAP / Lenis | Hand-written CSS keyframes (iris preloader, word reveal, heart burst, rings, stagger, marquee, confetti) |
| WebGL editor | CSS-filter editor with 12 presets, an intensity slider, brightness/contrast/saturation, aspect ratios and hold-to-compare |
| Recharts | An SVG/CSS bar chart with a text equivalent |
| node-cron worker | `worker/index.mjs` using `setInterval` |

## Features
Email auth with 3-step onboarding, roles (member/moderator/admin) · posts with up to 10 media items, alt text, location, hide likes, comments off, caption edit, delete · editor · reels with snap scrolling (only the visible one plays, autoplay is muted, mute choice is remembered, falls back to the poster image if the video fails) · Following feed (newest first) and Suggested feed (ranking rule explained), cursor-based infinite scroll, "New posts" pill, skeleton loaders, "You're all caught up" marker · stories (close-friends option, tap/hold/swipe, replies go to DMs, highlights) · double-tap like, nested comments, pin, saves into collections · Explore mosaic with category chips · profiles (private accounts, follow requests, tabs, highlights) · DMs (groups, message requests, unsend, reactions, vanish mode, block mid-chat, offline retry) · grouped notifications · search (accounts, tags, places, recent searches, trending tags) · report/block/mute/mute-stories/restrict/hidden words · moderation queue, audit log, analytics · settings (privacy, theme, reduce motion, take-a-break reminder, JSON export, deletion with grace period).

## Design system — "Gallery Noir Holo"
Dark: bg `#0A0A0C`, surface `#121216`, elevated `#1A1A21`, hairline `#26262F`, text `#F5F5F7`, muted `#9A9AA8`.
Light: bg `#FAFAF8`, surface `#FFFFFF`, elevated `#F1F1EE`, hairline `#E4E4E0`, text `#0A0A0C`, muted `#65656F`.
Brand: violet `#7B61FF`, bright `#9A86FF`, deep `#4B34C9`, tint `#ECE8FF`, like `#FF3B5C`, sky `#4CC2FF`, mint `#3DDBA8`, gold `#FFD36B`. Holo gradient: `linear-gradient(135deg,#7CF7E4,#8B7BFF 35%,#FF6BD6 70%,#FFD36B)`. Status colours: `#22C58B` / `#F5A524` / `#F0445A`.
Fonts: Manrope (headings), Inter (body), DM Mono (counts and timestamps). The holo gradient is only used for story rings, the Create button, onboarding progress and celebrations.

## Motion
Landing: iris preloader, drifting tilted wall of tiles with mouse parallax, staggered word reveal, aurora, a demo phone feed (labelled DEMO). Feed: rise-in, blur-up images, heart burst, stretching carousel dots, bouncing "New posts" pill, a drawn check for "caught up". Reels: snap scrolling, progress bar, play/pause glyph, heart at the tap point, scrolling audio marquee. Stories: rotating holo rings, segmented progress, dim on hold, swipe down to close. Chat: bubbles pop in, typing dots. Admin: bars draw in, resolved report cards swipe away. **Reduced motion:** both the OS `prefers-reduced-motion` setting and the Settings toggle (`html.reduce-motion`) turn animations off; parallax, the cursor halo and confetti are skipped. Only `transform` and `opacity` are animated.

## Run
```bash
cp .env.example .env        # set DATABASE_URL
npm install
npm run dev                 # tables + fictional seed data are created on the first request
node worker/index.mjs       # optional background jobs
```
Optional: `npx drizzle-kit push` to sync the schema.

### Demo accounts (password `lumio-demo`)
| Role | Email |
|---|---|
| Member | maya@lumio.demo |
| Private member | ren@lumio.demo |
| Moderator | mod@lumio.demo |
| Admin | admin@lumio.demo |

## Environment variables
| Var | Purpose |
|---|---|
| DATABASE_URL | Postgres connection |
| AUTH_SECRET | HMAC key for session cookies (**must be set in production**) |
| COOKIE_SECURE | `1` to set Secure cookies (HTTPS) |
| NEXT_PUBLIC_SITE_URL | Base URL for the sitemap |
| GOOGLE_*, CLOUDINARY_* | Optional integrations (not wired in this demo) |

## Schema overview
users, follows (status active/pending), posts (kind post/reel, media jsonb, filter, hide_likes, comments_off, deleted_at, removed_reason), likes, saves (collection), comments (parent_id, pinned), stories (close_friends, highlight, expires_at), close_friends, conversations (vanish), conversation_members (accepted = message request), messages (seen_at), notifications, blocks (kind block/mute/mute_story/restrict), reports, audit_log.

## API
Server actions in `src/lib/actions.ts` (like, save, comment, pin, follow, respond to follow requests, create post/story, highlight, DMs, report, relations, close friends, profile, moderation). Route handlers: `GET /api/feed?mode=&cursor=`, `GET|POST /api/messages/[id]` (poll / typing ping), `GET /api/export`, `GET /api/health`.
Realtime events (polling payload): `messages`, `alive` (ids that still exist, used for unsend and vanish), `typing`, `vanish`.

## Feeds
**Following:** your posts plus posts from accounts you actively follow, `ORDER BY id DESC` (newest first), cursor = last id.
**Suggested:** public posts from accounts you don't follow, excluding muted and blocked accounts, ranked by
`score = (likes + 2·comments + 3·saves + 1) / (ageHours + 2)^1.5`, using offset cursors. The UI shows this rule word for word.

## Privacy enforcement
A single SQL fragment, `VISIBLE` (`src/lib/sql.ts`), is used by the feed, explore, reels, tags, post pages, highlights, saved and story queries. It requires the author to be active, no block in either direction, and the account to be public OR the viewer to be the author OR an approved follower. Close-friends stories also need a `close_friends` row *at the time of viewing*, so list changes apply immediately. Restricted users' comments are hidden from the restricter. Every mutation reads the user from the signed cookie, never from the client. Likes use `ON CONFLICT DO NOTHING`, so they're idempotent and a double tap never counts twice. Blocking removes follows in both directions and stops DMs. Switching an account to public approves pending follow requests. Saved posts that are later deleted or become private disappear from Saved.

## Editor filters
Filters are stored as `id:intensity` (e.g. `warm:0.75`). `filterCss()` in `src/lib/logic.ts` maps them to CSS filter chains. **To add a filter:** add an entry to `FILTERS`. **To add a sticker:** edit the sticker list in `CreateFlow.tsx`. **To add a seed user:** add to `FIRST` in `bootstrap.ts`, then reset the DB.

## Video
Media is URL-based, and hosts are checked against an allow-list (`allowedMediaHosts`) with https required. Reels mount a `<video>` only for the active reel and its neighbours (the others show the poster), use `preload=auto` only for the active one, are muted by default, and fall back to the poster on error.

## Stories & highlights
Stories have `expires_at = now()+24h`. Queries ignore expired stories, and the worker deletes them. Five seeded stories expire within minutes so you can watch this happen. "Add to highlight" copies the story into a row with `highlight` set, which never expires.

## Notification grouping
`groupNotifications()` merges likes and comments on the same post: "Maya and 5 others liked your post". Notifications from blocked users are never shown.

## Moderation flow
A user reports something → it lands in the `/admin` queue with context (preview + thumbnail) → the moderator chooses dismiss / warn / remove / suspend with a transparency note → removed posts keep `removed_reason`, which the author sees on the post page along with how to appeal → every action is written to `audit_log`.

## Security notes
Parameterized SQL everywhere · React escaping (no raw HTML) · media URLs from allow-listed hosts only · rate limits on login, signup, likes, comments, follows, posts, messages, reports, feed and export · honeypot field · duplicate-comment and link limits · reserved usernames to prevent impersonation · httpOnly SameSite=Lax cookie (helps against CSRF; server actions also check the origin) · noindex on private pages.

## Deployment
Vercel (app) · Neon or Supabase (Postgres) · Render or Railway (worker) · Cloudinary (uploads). Set `AUTH_SECRET` and `COOKIE_SECURE=1`. Replace the in-memory rate limiter and typing state with Redis when running more than one instance.

## Legal & compliance (read before any real launch)
Minimum age (13+ in most regions; COPPA in the US, GDPR-K/age-appropriate design codes in the UK/EU) · a privacy policy with consent and a lawful basis · strip EXIF/location from uploads · moderation duties and reporting of illegal content (e.g. EU DSA, NCMEC reporting for CSAM) · DMCA/copyright takedown process · music licensing for audio · data export and deletion rights (GDPR/CCPA) · terms of service. Requirements vary by country, so get legal advice before going live.

## Media credits
Picsum Photos (Unsplash License) · DiceBear Notionists (CC0) · Google sample video bucket (test media) · Google Fonts (OFL). All URLs are in `src/config/media.ts`.

## Future improvements
Socket.IO, Auth.js with Google, Cloudinary signed uploads, a WebGL editor, a virtualized feed, Vitest coverage, i18n, PWA push notifications.

## License
MIT. Demo content is fictional.
