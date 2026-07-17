"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/app/actions/log";

export async function sendClientMessage(formData: FormData) {
  const clientUserId = formData.get("clientUserId") as string;
  const clientName = formData.get("clientName") as string;
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO client_messages (id, client_user_id, client_name, subject, message) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)"
    )
    .bind(clientUserId, clientName, subject, message)
    .run();

  await logActivity(clientName, "send_message", "admin", subject);
  revalidatePath("/client");
}

export async function replyToClientMessage(formData: FormData) {
  const messageId = formData.get("messageId") as string;
  const reply = formData.get("reply") as string;
  const now = new Date().toISOString();

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "UPDATE client_messages SET admin_reply = ?, replied = 1, replied_at = ?, read = 1 WHERE id = ?"
    )
    .bind(reply, now, messageId)
    .run();

  await logActivity("Admin", "reply_message", messageId, "Replied to client message");
  revalidatePath("/admin");
  revalidatePath("/client");
}

export async function markMessageRead(messageId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("UPDATE client_messages SET read = 1 WHERE id = ?").bind(messageId).run();
  revalidatePath("/admin");
}

export async function getAllClientMessages() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      "SELECT * FROM client_messages ORDER BY created_at DESC LIMIT 200"
    )
    .all();
  return results || [];
}
