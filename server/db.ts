import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ⭐ Auto-create the session table on startup (Render free-tier compatible)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" text PRIMARY KEY,
        "sess" text NOT NULL,
        "expire" text NOT NULL
      );
    `);
    console.log("Session table verified/created.");
  } catch (err) {
    console.error("Error creating session table:", err);
  }
})();

// Initialize drizzle ORM
export const db = drizzle(pool, { schema });
