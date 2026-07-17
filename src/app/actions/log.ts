"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export async function logActivity(
  actor: string,
  action: string,
  target: string,
  detail?: string
) {
  try {
    const db = (getRequestContext().env as any).zyanix_db;
    await db
      .prepare(
        "INSERT INTO activity_log (id, actor, action, target, detail) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)"
      )
      .bind(actor, action, target || null, detail || null)
      .run();
  } catch {
    // Non-blocking — don't crash on log failure
  }
}

export async function getActivityLog(limit = 100) {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all();
  return results || [];
}
