import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Auto-create correct session table for connect-pg-simple
(async () => {
  try {
    // Delete old incorrect table (text expire column)
    await pool.query(`DROP TABLE IF EXISTS "session";`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" text PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamptz NOT NULL
      );
    `);

    console.log("Session table recreated correctly.");
  } catch (err) {
    console.error("Error creating session table:", err);
  }
})();

export const db = drizzle(pool, { schema });
