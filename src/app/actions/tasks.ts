"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const assignedTo = formData.get("assignedTo") as string;
  const priority = formData.get("priority") as string;
  const dueDate = formData.get("dueDate") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO tasks (id, project_id, title, assigned_to, priority, due_date) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)"
    )
    .bind(projectId, title, assignedTo || null, priority || "medium", dueDate || null)
    .run();

  revalidatePath("/admin");
}

export async function updateTaskStatus(taskId: string, status: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("UPDATE tasks SET status = ? WHERE id = ?").bind(status, taskId).run();
  revalidatePath("/admin");
}

export async function deleteTask(taskId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId).run();
  revalidatePath("/admin");
}

export async function getAllTasks() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      `SELECT t.*, p.title as project_title FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       ORDER BY t.created_at DESC`
    )
    .all();
  return results || [];
}
