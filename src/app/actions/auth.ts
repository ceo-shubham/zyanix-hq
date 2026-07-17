"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword, createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { logActivity } from "@/app/actions/log";
import { revalidatePath } from "next/cache";

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const username = (formData.get("username") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  const user: any = await db
    .prepare("SELECT * FROM users WHERE username = ? AND active = 1")
    .bind(username)
    .first();

  if (!user) return { error: "Invalid credentials" };

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return { error: "Invalid credentials" };

  const permissions: string[] = user.page_permissions
    ? user.page_permissions.split(",").map((p: string) => p.trim())
    : [];

  // Admin is never forced to change password
  const mustChange = user.must_change_password === 1 && user.role !== "admin";

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    permissions,
    mustChangePassword: mustChange,
  });

  const cookieStore = await cookies();
  cookieStore.set({ name: "zyanix_session", value: token, httpOnly: true, sameSite: "lax", maxAge: 86400, path: "/" });

  await logActivity(user.name, "login", "auth", `${user.name} logged in`);

  if (mustChange) redirect("/set-password");

  const dest =
    user.role === "admin" ? "/admin" :
    user.role === "client" ? "/client" :
    "/dashboard";
  redirect(dest);
}

// ── User sets their own password (first login / after admin-approved reset) ───

export async function setNewPasswordAction(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (newPassword !== confirm) return { error: "Passwords do not match" };
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" };

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session || !session.mustChangePassword) redirect("/login");

  const db = (getRequestContext().env as any).zyanix_db;
  const hash = await hashPassword(newPassword);

  await db
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?")
    .bind(hash, session.userId)
    .run();

  await logActivity(session.name, "set_password", "auth", "User set their own password");

  // Issue full session — mustChangePassword cleared
  const newToken = await createSessionToken({
    userId: session.userId,
    username: session.username,
    role: session.role,
    name: session.name,
    permissions: session.permissions,
    mustChangePassword: false,
  });

  cookieStore.set({ name: "zyanix_session", value: newToken, httpOnly: true, sameSite: "lax", maxAge: 86400, path: "/" });

  const dest =
    session.role === "admin" ? "/admin" :
    session.role === "client" ? "/client" :
    "/dashboard";
  redirect(dest);
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set({ name: "zyanix_session", value: "", httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  redirect("/login");
}

// ── Admin: create team member ─────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const username = (formData.get("username") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const permissions = formData.get("permissions") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  const passwordHash = await hashPassword(password);

  await db
    .prepare(
      "INSERT INTO users (id, name, username, password_hash, role, page_permissions, must_change_password) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 1)"
    )
    .bind(name, username, passwordHash, role || "member", permissions || "tasks,notifications")
    .run();

  await logActivity("Admin", "create_user", username, `Created account: ${name}`);
  revalidatePath("/admin");
}

export async function updateUserPermissions(formData: FormData) {
  const userId = formData.get("userId") as string;
  const permissions = formData.get("permissions") as string;
  const active = formData.get("active") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare("UPDATE users SET page_permissions = ?, active = ? WHERE id = ?")
    .bind(permissions, active === "1" ? 1 : 0, userId)
    .run();

  await logActivity("Admin", "update_permissions", userId, `Permissions: ${permissions}`);
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").bind(userId).run();
  await logActivity("Admin", "delete_user", userId, "Deleted user account");
  revalidatePath("/admin");
}

export async function getAllUsers() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare("SELECT id, name, username, role, active, page_permissions, must_change_password, created_at FROM users ORDER BY created_at DESC")
    .all();
  return results || [];
}

// Admin sets a new temp password AND forces change on next login
export async function resetUserPassword(formData: FormData) {
  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;
  const db = (getRequestContext().env as any).zyanix_db;
  const hash = await hashPassword(newPassword);
  await db
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?")
    .bind(hash, userId)
    .run();
  await logActivity("Admin", "reset_password", userId, "Admin set temp password — user must change on next login");
  revalidatePath("/admin");
}

// Admin grants permission to re-set password (without changing it themselves)
export async function allowPasswordReset(userId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("UPDATE users SET must_change_password = 1 WHERE id = ?").bind(userId).run();
  await logActivity("Admin", "allow_password_reset", userId, "Admin allowed user to reset password");
  revalidatePath("/admin");
}
