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

// ⭐ SAFE DB Initialization (runs every restart but WITHOUT deleting anything)
(async () => {
  try {
    // 1) Ensure session table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" text PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamptz NOT NULL
      );
    `);
    console.log("Session table verified.");

    // 2) Ensure admin exists, but DO NOT delete anyone
    const adminResult = await pool.query(
      `SELECT id FROM users WHERE username = 'admin' LIMIT 1;`
    );

    if (adminResult.rows.length === 0) {
      const adminPassword = await hashPassword("A1AB2BC2C");

      await pool.query(
        `INSERT INTO users (username, password, role, wishlist_completed)
         VALUES ($1, $2, 'admin', false);`,
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
