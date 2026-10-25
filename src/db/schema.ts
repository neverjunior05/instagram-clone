// Drizzle schema for Lumio. Tables are also created idempotently at runtime by
// src/lib/bootstrap.ts so that a fresh database works without a migration step.
import { pgTable, serial, integer, text, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar").notNull(),
  bio: text("bio").default(""),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  isPrivate: boolean("is_private").notNull().default(false),
  hiddenWords: text("hidden_words").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [primaryKey({ columns: [t.followerId, t.followingId] })]);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull().default("post"),
  caption: text("caption").default(""),
  location: text("location"),
  media: jsonb("media").notNull(),
  filter: text("filter").default("none"),
  hideLikes: boolean("hide_likes").default(false),
  commentsOff: boolean("comments_off").default(false),
  deletedAt: timestamp("deleted_at"),
  removedReason: text("removed_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);

export const saves = pgTable("saves", {
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  collection: text("collection").notNull().default("All posts"),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaUrl: text("media_url").notNull(),
  text: text("text"),
  closeFriends: boolean("close_friends").default(false),
  highlight: text("highlight"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const closeFriends = pgTable("close_friends", {
  ownerId: integer("owner_id").notNull(),
  friendId: integer("friend_id").notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.friendId] })]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"),
  vanish: boolean("vanish").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversationMembers = pgTable("conversation_members", {
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull(),
  accepted: boolean("accepted").default(true),
  lastReadAt: timestamp("last_read_at"),
}, (t) => [primaryKey({ columns: [t.conversationId, t.userId] })]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  body: text("body").notNull(),
  seenAt: timestamp("seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  actorId: integer("actor_id").notNull(),
  type: text("type").notNull(),
  postId: integer("post_id"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blocks = pgTable("blocks", {
  blockerId: integer("blocker_id").notNull(),
  blockedId: integer("blocked_id").notNull(),
  kind: text("kind").notNull().default("block"),
}, (t) => [primaryKey({ columns: [t.blockerId, t.blockedId, t.kind] })]);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow(),
});
