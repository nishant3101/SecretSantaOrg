import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { hashPassword } from "./auth";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Safe init: do not delete users. Ensure admin exists.
(async () => {
  try {
    const adminResult = await pool.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1;`);
    if (adminResult.rows.length === 0) {
      const adminPassword = await hashPassword("A1AB2BC2C");
      await pool.query(
        `INSERT INTO users (username, password, role, wishlist_completed) VALUES ($1, $2, 'admin', false);`,
        ["admin", adminPassword]
      );
      console.log("Admin user created (username: admin).");
    } else {
      console.log("Admin already exists — not recreating.");
    }
  } catch (err) {
    console.error("DB init error:", err);
  }
})();

export const db = drizzle(pool, { schema });
