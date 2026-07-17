"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;
  const budget = formData.get("budget") as string;
  const deadlineDays = parseInt(formData.get("deadlineDays") as string) || 7;

  const current = new Date();
  current.setDate(current.getDate() + deadlineDays);
  const deadline = current.toISOString().split("T")[0];

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO projects (id, client_id, title, description, status, priority, delivery_deadline, budget) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'active', ?, ?, ?)"
    )
    .bind(clientId, title, description || null, priority || "medium", deadline, budget || null)
    .run();

  revalidatePath("/admin");
}

export async function updateProjectStatus(projectId: string, status: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("UPDATE projects SET status = ? WHERE id = ?").bind(status, projectId).run();
  revalidatePath("/admin");
}

export async function getActiveProjects() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      `SELECT p.*, d.name as client_name
       FROM projects p
       JOIN directory d ON p.client_id = d.id
       ORDER BY p.created_at DESC`
    )
    .all();
  return results || [];
}

export async function getProjectStats() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results: all } = await db.prepare("SELECT status FROM projects").all();
  const projects: any[] = all || [];
  return {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    paused: projects.filter((p) => p.status === "paused").length,
  };
}
