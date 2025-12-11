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
  // AUTH ROUTES (login/logout)
  //
  setupAuth(app);

  //
  // Legacy requireAuth (not used for admin anymore)
  //
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  //
  // NEW STATELESS ADMIN CHECK
  //
  const requireAdmin = (req: any, res: any, next: any) => {
    const token = req.headers["x-admin-secret"];
    if (!token || token !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  //
  // -----------------------------
  // PUBLIC READ ENDPOINTS
  // -----------------------------
  //

  // Get app state (shuffle status)
  app.get("/api/app-state", async (_req, res) => {
    try {
      const state = await storage.getAppState();
      res.json(state);
    } catch (error) {
      console.error("Get app state error:", error);
      res.status(500).json({ message: "Failed to get app state" });
    }
  });

  // Get all participants (PUBLIC READ)
  // This stays open so the admin dashboard can load participants without auth
  app.get("/api/participants", async (_req, res) => {
    try {
      const participants = await storage.getAllParticipants();
      res.json(participants);
    } catch (error) {
      console.error("Get participants error:", error);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  //
  // -----------------------------
  // ADMIN WRITE ENDPOINTS
  // -----------------------------
  //

  // Create participant (admin only)
  app.post("/api/participants", requireAdmin, async (req, res) => {
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

      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Cannot add participants after shuffle. Reset first." });
      }

      const user = await storage.createUser({
        username,
        password,
        role: "participant",
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("Create participant error:", error);
      res.status(500).json({ message: "Failed to create participant" });
    }
  });

  // Delete participant (admin only)
  app.delete("/api/participants/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Cannot delete participants after shuffle. Reset first." });
      }

      await storage.deleteUser(id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete participant error:", error);
      res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  //
  // -----------------------------
  // PARTICIPANT WISHLIST ROUTES
  // -----------------------------
  //

  // Get current user's wishlist
  app.get("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const wishlist = await storage.getWishlistByUserId(req.user!.id);
      res.json(wishlist || null);
    } catch (error) {
      console.error("Get wishlist error:", error);
      res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  // Update wishlist
  app.post("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const { item1, item2, item3 } = req.body;

      const trimmedItem1 = item1?.trim() || "";
      const trimmedItem2 = item2?.trim() || "";
      const trimmedItem3 = item3?.trim() || "";

      if (!trimmedItem1 && !trimmedItem2 && !trimmedItem3) {
        return res.status(400).json({ message: "At least one wishlist item is required" });
      }

      const wishlist = await storage.createOrUpdateWishlist(
        req.user!.id,
        trimmedItem1 || undefined,
        trimmedItem2 || undefined,
        trimmedItem3 || undefined
      );

      await storage.updateUserWishlistStatus(req.user!.id, true);

      const updatedUser = await storage.getUser(req.user!.id);

      res.json({ wishlist, user: updatedUser });
    } catch (error) {
      console.error("Save wishlist error:", error);
      res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  //
  // -----------------------------
  // SECRET SANTA ASSIGNMENT ROUTES
  // -----------------------------
  //

  // Get current user's assignment
  app.get("/api/my-assignment", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignmentByGiverId(req.user!.id);
      res.json(assignment || null);
    } catch (error) {
      console.error("Get assignment error:", error);
      res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  // Shuffle assignments (admin only)
  app.post("/api/shuffle", requireAdmin, async (_req, res) => {
    try {
      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Shuffle has already been completed. Reset first." });
      }

      const participants = await storage.getAllParticipants();

      if (participants.length < 3) {
        return res.status(400).json({ message: "Need at least 3 participants to shuffle" });
      }

      const allCompleted = participants.every(p => p.wishlistCompleted);
      if (!allCompleted) {
        return res.status(400).json({ message: "Not all participants have completed their wishlists" });
      }

      await storage.deleteAllAssignments();

      // Sattolo's algorithm
      const ids = participants.map(p => p.id);
      const receivers = [...ids];
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      for (let i = 0; i < ids.length; i++) {
        await storage.createAssignment(ids[i], receivers[i]);
      }

      await storage.setShuffleCompleted(true);

      res.json({ message: "Shuffle completed successfully" });
    } catch (error) {
      console.error("Shuffle error:", error);
      res.status(500).json({ message: "Failed to shuffle" });
    }
  });

  // Reset shuffle (admin only)
  app.post("/api/reset", requireAdmin, async (_req, res) => {
    try {
      await storage.deleteAllAssignments();
      await storage.setShuffleCompleted(false);
      res.json({ message: "Reset completed" });
    } catch (error) {
      console.error("Reset error:", error);
      res.status(500).json({ message: "Failed to reset" });
    }
  });

  return httpServer;
}
