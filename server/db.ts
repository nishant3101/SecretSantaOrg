// server/db.ts
import { storage } from "./storage";

export async function seedAdmin() {
  const existing = await storage.getUserByUsername("admin");
  if (existing) return;

  await storage.createUser({
    id: Date.now(),       // simple unique ID
    username: "admin",
    password: "admin123", // plain text (Option 1)
    role: "admin",
    wishlistCompleted: false,
  });

  console.log("Seeded admin user → username: admin | password: admin123");
}
