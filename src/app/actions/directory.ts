"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function addRecord(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO directory (id, name, email, role, phone, notes) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)"
    )
    .bind(name, email, role, phone || null, notes || null)
    .run();

  revalidatePath("/admin");
}

export async function getDirectory() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare("SELECT * FROM directory ORDER BY created_at DESC")
    .all();
  return results || [];
}
