// server/auth.ts
import { Express } from "express";
import { storage } from "./storage";

/**
 * Very simple auth implementation (Option 1):
 * - No sessions
 * - No passport
 * - Login checks username/password (plain text) and returns user object on success
 * - Register is disabled (returns 403) — admin must be created by the DB seeding script
 *
 * NOTE: This stores passwords in plain text. This is purposely the simplest option you asked for.
 * If you want password hashing later, I can add it.
 */

type LoginRequestBody = {
  username?: string;
  password?: string;
};

export function setupAuth(app: Express) {
  // Simple login endpoint
  app.post("/api/login", async (req, res, next) => {
    try {
      const body = req.body as LoginRequestBody;
      if (!body || !body.username || !body.password) {
        return res.status(400).json({ message: "username and password required" });
      }

      const user = await storage.getUserByUsername(body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Option 1: plain-text compare (simple)
      if (user.password !== body.password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Return the user object (do not send password)
      const { password, ...safeUser } = user as any;
      return res.json({ success: true, user: safeUser });
    } catch (err) {
      next(err);
    }
  });

  // Registration disabled for safety (admin should be created server-side)
  app.post("/api/register", (_req, res) => {
    res.status(403).json({ message: "Registration is disabled. Use the seeded admin account." });
  });

  // Logout (no-op for stateless)
  app.post("/api/logout", (_req, res) => {
    // Client is stateless: it should clear its local memory. Server does nothing.
    res.json({ success: true });
  });

  // Return the current user placeholder:
  // Since there are no sessions the server cannot know "current user".
  // The frontend will store the logged-in user in memory and use it to render UI.
  // To preserve compatibility, /api/user will return 204 (no content).
  app.get("/api/user", (_req, res) => {
    // Client-side should keep the user object; server doesn't manage sessions here.
    res.status(204).end();
  });
}
