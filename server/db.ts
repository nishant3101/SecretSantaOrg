// server/db.ts
import { db } from "./storage";

export async function seedAdmin() {
  const existing = await db.getUserByUsername("admin");
  if (existing) return;

  await db.createUser({
    username: "admin",
    password: "A1AB2BC2C",   // ⭐ Plain text (Option 1)
    role: "admin",
  });

  console.log("Seeded admin user → username: admin | password: admin123");
}
