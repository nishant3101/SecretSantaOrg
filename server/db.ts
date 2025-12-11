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

// ⭐ DB Initialization (runs every deploy)
(async () => {
  try {
    // 1) Ensure session table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" text PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamptz NOT NULL
      );
    `);
    console.log("Session table verified.");

    // 2) CLEAR all users (fresh start every deploy)
    await pool.query(`DELETE FROM users;`);
    console.log("All users deleted.");

    // 3) Insert fixed admin account
    const adminPassword = await hashPassword("A1AB2BC2C");

    await pool.query(
      `INSERT INTO users (username, password, role, wishlist_completed) 
       VALUES ($1, $2, 'admin', false);`,
      ["admin", adminPassword]
    );

    console.log("Admin user recreated (username: admin).");
  } catch (err) {
    console.error("DB init error:", err);
  }
})();

export const db = drizzle(pool, { schema });
