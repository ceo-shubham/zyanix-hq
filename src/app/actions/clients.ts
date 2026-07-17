"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/app/actions/log";

/** Generate next available client ID like Z001@zyanix, Z002@zyanix … */
async function nextClientUsername(db: any): Promise<string> {
  const { results } = await db
    .prepare("SELECT username FROM users WHERE role = 'client' ORDER BY created_at ASC")
    .all();
  const used = new Set((results || []).map((r: any) => r.username));
  for (let i = 1; i <= 999; i++) {
    const id = `Z${String(i).padStart(3, "0")}@zyanix`;
    if (!used.has(id)) return id;
  }
  throw new Error("No available client IDs");
}

/** Admin creates a client portal account.
 *  Links to an existing directory entry OR creates one. */
export async function createClientAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const directoryId = formData.get("directoryId") as string; // existing client id
  const pagePerms = formData.get("page_permissions") as string;

  const db = (getRequestContext().env as any).zyanix_db;

  // Resolve client directory ID
  let clientId = directoryId;
  if (!clientId) {
    // Create directory entry too
    const newId = `dir-${Date.now()}`;
    await db
      .prepare("INSERT INTO directory (id, name, email, role, phone) VALUES (?, ?, ?, 'client', ?)")
      .bind(newId, name, email || "", phone || null)
      .run();
    clientId = newId;
  }

  const username = await nextClientUsername(db);
  // Default password = username (e.g. Z001@zyanix)
  const passwordHash = await hashPassword(username);
  const userId = `client-${Date.now()}`;

  await db
    .prepare(
      `INSERT INTO users (id, name, username, password_hash, role, active, page_permissions, client_id, must_change_password)
       VALUES (?, ?, ?, ?, 'client', 1, ?, ?, 1)`
    )
    .bind(userId, name, username, passwordHash, pagePerms || "overview,projects,payments,messages", clientId)
    .run();

  await logActivity("Admin", "create_client", username, `Created client portal: ${name}`);
  revalidatePath("/admin");

  return { username, password: username }; // password = ID by default
}

export async function updateClientPermissions(formData: FormData) {
  const userId = formData.get("userId") as string;
  const permissions = formData.get("permissions") as string;
  const active = formData.get("active") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare("UPDATE users SET page_permissions = ?, active = ? WHERE id = ?")
    .bind(permissions, active === "1" ? 1 : 0, userId)
    .run();

  await logActivity("Admin", "update_client_permissions", userId, `Permissions: ${permissions}`);
  revalidatePath("/admin");
}

export async function resetClientPassword(formData: FormData) {
  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;
  const db = (getRequestContext().env as any).zyanix_db;
  const hash = await hashPassword(newPassword);
  // must_change_password = 1 → user must set their own on next login
  await db
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?")
    .bind(hash, userId)
    .run();
  await logActivity("Admin", "reset_client_password", userId, "Admin set temp password — client must change on next login");
  revalidatePath("/admin");
}

export async function getAllClients() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare(
      `SELECT u.*, d.email, d.phone, d.notes as dir_notes
       FROM users u
       LEFT JOIN directory d ON u.client_id = d.id
       WHERE u.role = 'client'
       ORDER BY u.created_at DESC`
    )
    .all();
  return results || [];
}

export async function getClientPortalData(clientUserId: string) {
  const db = (getRequestContext().env as any).zyanix_db;

  // Get user + directory info
  const user: any = await db
    .prepare(
      `SELECT u.*, d.name as dir_name, d.email, d.phone, d.role as dir_role, d.notes as dir_notes
       FROM users u LEFT JOIN directory d ON u.client_id = d.id
       WHERE u.id = ?`
    )
    .bind(clientUserId)
    .first();

  if (!user) return null;

  // Projects for this client
  const { results: projects } = await db
    .prepare(
      `SELECT p.* FROM projects p WHERE p.client_id = ? ORDER BY p.created_at DESC`
    )
    .bind(user.client_id)
    .all();

  // Project updates for those projects
  const projectIds = (projects || []).map((p: any) => p.id);
  let updates: any[] = [];
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    const { results: upd } = await db
      .prepare(
        `SELECT pu.*, p.title as project_title FROM project_updates pu
         JOIN projects p ON pu.project_id = p.id
         WHERE pu.project_id IN (${placeholders}) AND pu.visible_to_client = 1
         ORDER BY pu.created_at DESC`
      )
      .bind(...projectIds)
      .all();
    updates = upd || [];
  }

  // Revenue (payments) for this client's projects
  let payments: any[] = [];
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    const { results: pay } = await db
      .prepare(
        `SELECT r.*, p.title as project_title FROM revenue r
         JOIN projects p ON r.project_id = p.id
         WHERE r.project_id IN (${placeholders}) AND r.type = 'income'
         ORDER BY r.date DESC`
      )
      .bind(...projectIds)
      .all();
    payments = pay || [];
  }

  // Tasks visible to client (for their projects)
  let tasks: any[] = [];
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    const { results: t } = await db
      .prepare(
        `SELECT t.*, p.title as project_title FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.project_id IN (${placeholders})
         ORDER BY t.created_at DESC`
      )
      .bind(...projectIds)
      .all();
    tasks = t || [];
  }

  // Messages
  const { results: messages } = await db
    .prepare("SELECT * FROM client_messages WHERE client_user_id = ? ORDER BY created_at DESC")
    .bind(clientUserId)
    .all();

  return {
    user,
    projects: projects || [],
    updates,
    payments,
    tasks,
    messages: messages || [],
  };
}
