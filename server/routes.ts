// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup login + session
  setupAuth(app);

  // Simple auth check for participant routes
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  //
  // PUBLIC READ ENDPOINTS
  //
  app.get("/api/app-state", async (_req, res) => {
    try {
      res.json(await storage.getAppState());
    } catch {
      res.status(500).json({ message: "Failed to get app state" });
    }
  });

  // Public participant list (admin dashboard)
  app.get("/api/participants", async (_req, res) => {
    try {
      res.json(await storage.getAllParticipants());
    } catch {
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  //
  // PUBLIC WRITE ENDPOINTS (ADMIN WITHOUT SECURITY)
  //
  app.post("/api/participants", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || username.length < 3)
        return res.status(400).json({ message: "Username too short" });

      if (!password || password.length < 4)
        return res.status(400).json({ message: "Password too short" });

      const existing = await storage.getUserByUsername(username);
      if (existing)
        return res.status(400).json({ message: "Username already exists" });

      const user = await storage.createUser({
        username,
        password,
        role: "participant",
      });

      res.status(201).json(user);
    } catch (err) {
      console.error("Create participant error:", err);
      res.status(500).json({ message: "Failed to create participant" });
    }
  });

  app.delete("/api/participants/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteUser(id);
      res.sendStatus(200);
    } catch {
      res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  //
  // PARTICIPANT WISHLIST — REQUIRES LOGIN
  //
  app.get("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getWishlistByUserId(req.user.id));
    } catch {
      res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  app.post("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const { item1, item2, item3 } = req.body;

      const wishlist = await storage.createOrUpdateWishlist(
        req.user.id,
        item1?.trim() || undefined,
        item2?.trim() || undefined,
        item3?.trim() || undefined
      );

      await storage.updateUserWishlistStatus(req.user.id, true);

      res.json({ wishlist });
    } catch {
      res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  //
  // USER ASSIGNMENT
  //
  app.get("/api/my-assignment", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getAssignmentByGiverId(req.user.id));
    } catch {
      res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  //
  // SHUFFLE — NO ADMIN SECURITY
  //
  app.post("/api/shuffle", async (req, res) => {
    try {
      const participants = await storage.getAllParticipants();

      if (participants.length < 3)
        return res
          .status(400)
          .json({ message: "Need at least 3 participants to shuffle" });

      const allCompleted = participants.every((p) => p.wishlistCompleted);
      if (!allCompleted)
        return res
          .status(400)
          .json({ message: "Some participants haven't completed wishlist" });

      await storage.deleteAllAssignments();

      // Sattolo's derangement algorithm
      const ids = participants.map((p) => p.id);
      const receivers = [...ids];
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      for (let i = 0; i < ids.length; i++) {
        await storage.createAssignment(ids[i], receivers[i]);
      }

      await storage.setShuffleCompleted(true);

      res.json({ message: "Shuffle completed" });
    } catch (err) {
      console.error("Shuffle error:", err);
      res.status(500).json({ message: "Failed to shuffle" });
    }
  });

  //
  // RESET — NO ADMIN SECURITY
  //
  app.post("/api/reset", async (_req, res) => {
    try {
      await storage.deleteAllAssignments();
      await storage.setShuffleCompleted(false);
      res.json({ message: "Reset successful" });
    } catch {
      res.status(500).json({ message: "Failed to reset" });
    }
  });

  return httpServer;
}
