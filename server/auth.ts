// server/auth.ts
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";

export function setupAuth(app: Express) {
  // --- SESSION MIDDLEWARE ---
  app.use(
    session({
      secret: "santa-secret-key", // choose any string
      resave: false,
      saveUninitialized: false,
    })
  );

  // Middleware to attach session user to req.user
  app.use((req: any, _res, next) => {
    req.user = req.session.user || null;
    next();
  });

  // --- LOGIN ---
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Save user in session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      res.json(req.session.user);
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // --- LOGOUT ---
  app.post("/api/logout", async (req: any, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // --- CURRENT USER ENDPOINT ---
  app.get("/api/user", (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ user: null });
    }
    res.json(req.user);
  });
}
