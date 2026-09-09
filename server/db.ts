import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, alertEvents, alertRules, followedAreas, users, workspacePreferences } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getWorkspace(userId: number) {
  const db = await getDb(); if (!db) return { preferences: null, areas: [], rules: [] };
  const [preferences, areas, rules] = await Promise.all([
    db.select().from(workspacePreferences).where(eq(workspacePreferences.userId, userId)).orderBy(desc(workspacePreferences.updatedAt)).limit(1),
    db.select().from(followedAreas).where(eq(followedAreas.userId, userId)).orderBy(desc(followedAreas.createdAt)),
    db.select().from(alertRules).where(and(eq(alertRules.userId, userId), eq(alertRules.enabled, 1))).orderBy(desc(alertRules.createdAt)),
  ]);
  return { preferences: preferences[0] ?? null, areas, rules };
}

export async function getAlertHistory(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(alertEvents).where(eq(alertEvents.userId, userId)).orderBy(desc(alertEvents.createdAt)).limit(50);
}

export async function addFollowedArea(userId: number, name: string, region: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(followedAreas).values({ userId, name, region });
  return { id: Number(result[0].insertId), userId, name, region };
}

export async function removeFollowedArea(userId: number, id: number) {
  const db = await getDb(); if (!db) return false;
  await db.delete(followedAreas).where(and(eq(followedAreas.id, id), eq(followedAreas.userId, userId)));
  return true;
}

export async function addAlertRule(userId: number, name: string, category: string, severity: "low" | "moderate" | "high", region = "Global") {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(alertRules).values({ userId, name, category, severity, region, enabled: 1 });
  return { id: Number(result[0].insertId), userId, name, category, severity, region, enabled: 1 };
}

export async function toggleAlertRule(userId: number, id: number, enabled: boolean) {
  const db = await getDb(); if (!db) return false;
  await db.update(alertRules).set({ enabled: enabled ? 1 : 0 }).where(and(eq(alertRules.id, id), eq(alertRules.userId, userId)));
  return true;
}

export async function saveWorkspacePreferences(userId: number, visibleLayers: string[], defaultRegion = "Global") {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(workspacePreferences).where(eq(workspacePreferences.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(workspacePreferences).set({ visibleLayers: JSON.stringify(visibleLayers), defaultRegion }).where(eq(workspacePreferences.id, existing[0].id));
    return { ...existing[0], visibleLayers: JSON.stringify(visibleLayers), defaultRegion };
  }
  const result = await db.insert(workspacePreferences).values({ userId, visibleLayers: JSON.stringify(visibleLayers), defaultRegion });
  return { id: Number(result[0].insertId), userId, visibleLayers: JSON.stringify(visibleLayers), defaultRegion };
}
