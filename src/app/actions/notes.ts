"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function createNote(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare("INSERT INTO notes (id, title, content) VALUES (lower(hex(randomblob(16))), ?, ?)")
    .bind(title, content)
    .run();

  revalidatePath("/admin");
}

export async function togglePinNote(noteId: string, pinned: number) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("UPDATE notes SET pinned = ? WHERE id = ?").bind(pinned ? 0 : 1, noteId).run();
  revalidatePath("/admin");
}

export async function deleteNote(noteId: string) {
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare("DELETE FROM notes WHERE id = ?").bind(noteId).run();
  revalidatePath("/admin");
}

export async function getAllNotes() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare("SELECT * FROM notes ORDER BY pinned DESC, created_at DESC")
    .all();
  return results || [];
}
