"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/app/actions/log";

export async function sendNotification(formData: FormData) {
  const userId = formData.get("userId") as string;
  const title = formData.get("title") as string;
  const message = formData.get("message") as string;

  const db = (getRequestContext().env as any).zyanix_db;

  if (userId === "all") {
    // Send to all active non-admin users
    const { results } = await db
      .prepare("SELECT id FROM users WHERE role = 'member' AND active = 1")
      .all();
    for (const u of (results || []) as any[]) {
      await db
        .prepare(
          "INSERT INTO notifications (id, user_id, title, message) VALUES (lower(hex(randomblob(16))), ?, ?, ?)"
        )
        .bind(u.id, title, message)
        .run();
    }
    await logActivity("Admin", "send_notification", "all_members", title);
  } else {
    await db
      .prepare(
        "INSERT INTO notifications (id, user_id, title, message) VALUES (lower(hex(randomblob(16))), ?, ?, ?)"
      )
      .bind(userId, title, message)
      .run();
    await logActivity("Admin", "send_notification", userId, title);
  }

  revalidatePath("/admin");
}

export async function markNotificationRead(notificationId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare("UPDATE notifications SET read = 1 WHERE id = ?")
    .bind(notificationId)
    .run();
  revalidatePath("/dashboard");
}

export async function getNotificationsForUser(userId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .bind(userId)
    .all();
  return results || [];
}

export async function getAllNotifications() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      `SELECT n.*, u.name as user_name FROM notifications n
       JOIN users u ON n.user_id = u.id
       ORDER BY n.created_at DESC LIMIT 100`
    )
    .all();
  return results || [];
}
