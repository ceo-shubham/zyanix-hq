/**
 * Run: node scripts/create-admin.mjs
 * Creates the initial admin SQL with hashed password,
 * then pipes it into local D1.
 * Usage: node scripts/create-admin.mjs <username> <password>
 */
import { execSync } from "child_process";
import { createHash } from "crypto";

const username = process.argv[2] || "admin";
const password = process.argv[3] || "zyanix2026";
const SECRET = "zyanix-hq-secret-2026";

// Must match hashPassword() in src/lib/auth.ts
const hash = createHash("sha256").update(password + SECRET).digest("hex");

const sql = `INSERT OR REPLACE INTO users (id, name, username, password_hash, role, active, page_permissions)
VALUES ('admin-founder-001', 'Founder', '${username}', '${hash}', 'admin', 1, 'tasks,projects,notifications,directory,finance');`;

console.log("Creating admin user...");
console.log("Username:", username);
console.log("SQL:", sql);

// Write temp file and execute
import { writeFileSync } from "fs";
writeFileSync("_tmp_admin.sql", sql);

try {
  execSync("npx wrangler d1 execute zyanix-db --local --file=_tmp_admin.sql", { stdio: "inherit" });
  execSync("npx wrangler d1 execute zyanix-db --remote --file=_tmp_admin.sql", { stdio: "inherit" });
  console.log("\n✅ Admin account created!");
  console.log(`   Login at /login with: ${username} / ${password}`);
} finally {
  import("fs").then(({ unlinkSync }) => { try { unlinkSync("_tmp_admin.sql"); } catch {} });
}
