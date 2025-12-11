// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertUserSchema, updateWishlistSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  //
  // AUTH ROUTES
  //
  setupAuth(app);

  //
  // (OPTIONAL) simple requireAuth for participant routes — keep or remove
  //
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  //
  // -----------------------------
  // PUBLIC READ ROUTES
  // -----------------------------
  //

  app.get("/api/app-state", async (_req, res) => {
    try {
      const state = await storage.getAppState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: "Failed to get app state" });
    }
  });

  app.get("/api/participants", async (_req, res) => {
    try {
      const participants = await storage.getAllParticipants();
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  //
  // -----------------------------
  // PUBLIC WRITE ROUTES (NO SECURITY)
  // -----------------------------
  //

  // Create participant (NO ADMIN CHECK)
  app.post("/api/participants", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }

      if (!password || password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password,
        role: "participant",
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to create participant" });
    }
  });

  // Delete participant (NO ADMIN CHECK)
  app.delete("/api/participants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  //
  // -----------------------------
  // PARTICIPANT WISHLIST
  // (Optional: remove requireAuth if you want NO SECURITY AT ALL)
  // -----------------------------
  //

  app.get("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const wishlist = await storage.getWishlistByUserId(req.user!.id);
      res.json(wishlist || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  app.post("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const { item1, item2, item3 } = req.body;

      const wishlist = await storage.createOrUpdateWishlist(
        req.user!.id,
        item1?.trim() || undefined,
        item2?.trim() || undefined,
        item3?.trim() || undefined
      );

      await storage.updateUserWishlistStatus(req.user!.id, true);

      res.json({ wishlist });
    } catch (error) {
      res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  //
  // -----------------------------
  // SECRET SANTA SHUFFLE (NO ADMIN CHECK)
  // -----------------------------
  //

  app.post("/api/shuffle", async (_req, res) => {
    try {
      const participants = await storage.getAllParticipants();

      if (participants.length < 3) {
        return res.status(400).json({ message: "Need at least 3 participants to shuffle" });
      }

      const allCompleted = participants.every((p) => p.wishlistCompleted);
      if (!allCompleted) {
        return res.status(400).json({ message: "Some participants have not completed their wishlists" });
      }

      await storage.deleteAllAssignments();

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
    } catch (error) {
      res.status(500).json({ message: "Failed to shuffle" });
    }
  });

  //
  // Reset shuffle (NO ADMIN CHECK)
  //
  app.post("/api/reset", async (_req, res) => {
    try {
      await storage.deleteAllAssignments();
      await storage.setShuffleCompleted(false);
      res.json({ message: "Reset completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset" });
    }
  });

  return httpServer;
}
