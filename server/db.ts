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
  // you can add more pool options here if needed
});

// ⭐ Auto-create/repair the session table and normalize admins on startup (Render free-tier compatible)
(async () => {
  try {
    // 1) Ensure session table exists and has the correct types:
    //    sid: text PRIMARY KEY
    //    sess: json NOT NULL
    //    expire: timestamptz NOT NULL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" text PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamptz NOT NULL
      );
    `);
    console.log("Session table verified/created (sid,sess,expire).");

    // 2) Normalize admin accounts:
    //    - If multiple admins exist, keep the earliest (smallest id) as admin and demote the rest to participant
    //    - If no admin exists but users exist, promote the earliest user to admin
    //    - This runs safely and idempotently on startup
    const { rows: adminRows } = await pool.query(`
      SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC;
    `);

    if (adminRows.length > 1) {
      const firstAdminId = adminRows[0].id;
      // Demote any admin that is not the firstAdminId
      await pool.query(
        `UPDATE users SET role = 'participant' WHERE role = 'admin' AND id != $1;`,
        [firstAdminId],
      );
      console.log(`Normalized admins: kept id=${firstAdminId} as admin, demoted others.`);
    } else if (adminRows.length === 0) {
      // No admin exists: promote the earliest user (if any)
      const { rows: earliest } = await pool.query(`
        SELECT id FROM users ORDER BY id ASC LIMIT 1;
      `);
      if (earliest.length === 1) {
        const promoteId = earliest[0].id;
        await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1;`, [promoteId]);
        console.log(`Promoted user id=${promoteId} to admin (no prior admin found).`);
      } else {
        console.log("No users found to promote to admin (empty users table).");
      }
    } else {
      console.log("Exactly one admin exists — no normalization required.");
    }
  } catch (err) {
    console.error("Error during DB startup tasks (session table / admin normalization):", err);
  }
})();

// Initialize drizzle ORM
export const db = drizzle(pool, { schema });
