import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspacePreferences = mysqlTable("workspace_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  visibleLayers: text("visibleLayers").notNull(),
  defaultRegion: varchar("defaultRegion", { length: 80 }).default("Global"),
  theme: varchar("theme", { length: 20 }).default("dark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const followedAreas = mysqlTable("followed_areas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  geometry: text("geometry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const alertRules = mysqlTable("alert_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  severity: mysqlEnum("severity", ["low", "moderate", "high"]).default("moderate").notNull(),
  region: varchar("region", { length: 120 }).default("Global"),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const alertEvents = mysqlTable("alert_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ruleId: int("ruleId"),
  title: varchar("title", { length: 180 }).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  sourceUrl: text("sourceUrl"),
  observedAt: timestamp("observedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type WorkspacePreferences = typeof workspacePreferences.$inferSelect;
export type FollowedArea = typeof followedAreas.$inferSelect;
export type AlertRule = typeof alertRules.$inferSelect;
export type AlertEvent = typeof alertEvents.$inferSelect;
