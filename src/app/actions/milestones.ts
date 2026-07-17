"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function toggleMilestone(projectId: string, milestone: string, currentStatus: string) {
  const nextStatus = currentStatus === 'pending' ? 'paid' : 'pending';
  const db = (getRequestContext().env as any).zyanix_db;
  await db.prepare(`UPDATE projects SET ${milestone} = ? WHERE id = ?`).bind(nextStatus, projectId).run();
  revalidatePath("/admin");
}
