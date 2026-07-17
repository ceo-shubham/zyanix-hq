"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/app/actions/log";

export async function postProjectUpdate(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const visibleToClient = formData.get("visibleToClient") === "1" ? 1 : 0;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO project_updates (id, project_id, title, content, visible_to_client) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)"
    )
    .bind(projectId, title, content, visibleToClient)
    .run();

  await logActivity("Admin", "post_update", projectId, title);
  revalidatePath("/admin");
  revalidatePath("/client");
}

export async function deleteProjectUpdate(updateId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("DELETE FROM project_updates WHERE id = ?").bind(updateId).run();
  revalidatePath("/admin");
}

export async function getAllProjectUpdates() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      `SELECT pu.*, p.title as project_title FROM project_updates pu
       JOIN projects p ON pu.project_id = p.id
       ORDER BY pu.created_at DESC LIMIT 100`
    )
    .all();
  return results || [];
}
