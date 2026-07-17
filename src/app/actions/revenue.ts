"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { revalidatePath } from "next/cache";

export async function addRevenue(formData: FormData) {
  const label = formData.get("label") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const date = formData.get("date") as string;
  const projectId = formData.get("projectId") as string;

  const db = (getRequestContext().env as any).zyanix_db;
  await db
    .prepare(
      "INSERT INTO revenue (id, project_id, label, amount, type, date) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)"
    )
    .bind(projectId || null, label, amount, type, date)
    .run();

  revalidatePath("/admin");
}

export async function getRevenueSummary() {
  const db = (getRequestContext().env as any).zyanix_db;
  const { results } = await db
    .prepare("SELECT * FROM revenue ORDER BY date DESC LIMIT 20")
    .all();

  const allRevenue: any[] = results || [];
  const income = allRevenue.filter((r) => r.type === "income").reduce((a: number, r: any) => a + r.amount, 0);
  const expense = allRevenue.filter((r) => r.type === "expense").reduce((a: number, r: any) => a + r.amount, 0);

  return { entries: allRevenue, income, expense, net: income - expense };
}
