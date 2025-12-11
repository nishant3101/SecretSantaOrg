import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertUserSchema, updateWishlistSchema } from "@shared/schema";

/**
 * requireAuth middleware:
 * - Accepts userId from req.body.userId OR req.headers['x-user-id'].
 * - Loads user from DB and attaches to req.user (as any).
 */
const requireAuth = async (req: any, res: any, next: any) => {
  const bodyId = req.body?.userId;
  const headerId = req.headers["x-user-id"];
  const userId = bodyId ?? headerId;
  if (!userId) return res.status(401).json({ message: "Unauthorized. Provide userId in request body or x-user-id header." });

  const user = await storage.getUser(Number(userId));
  if (!user) return res.status(401).json({ message: "Unauthorized - user not found." });

  req.user = user;
  next();
};

/**
 * requireAdmin middleware: must be authenticated first.
 */
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // register auth (stateless)
  setupAuth(app);

  // Admin-only: list participants
  app.get("/api/participants", requireAuth, requireAdmin, async (req, res) => {
    try {
      const participants = await storage.getAllParticipants();
      res.json(participants);
    } catch (error) {
      console.error("Failed to get participants:", error);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  // Create a new participant (admin only)
  app.post("/api/participants", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid user payload" });

      // create as participant always
      const user = await storage.createUser({
        username: parsed.data.username,
        password: parsed.data.password,
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("Create participant error:", error);
      res.status(500).json({ message: "Failed to create participant" });
    }
  });

  // Delete a participant (admin only)
  app.delete("/api/participants/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Cannot delete participants after shuffle. Reset first." });
      }

      // Prevent admin deleting themselves
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      await storage.deleteUser(id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete participant error:", error);
      res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  // Get current user's wishlist (requires userId)
  app.post("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const wishlist = await storage.getWishlistByUserId(req.user.id);
      res.json(wishlist || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  // Save/update current user's wishlist
  app.post("/api/save-my-wishlist", requireAuth, async (req, res) => {
    try {
      const { item1, item2, item3 } = req.body;

      const trimmedItem1 = item1?.trim() || "";
      const trimmedItem2 = item2?.trim() || "";
      const trimmedItem3 = item3?.trim() || "";

      if (!trimmedItem1 && !trimmedItem2 && !trimmedItem3) {
        return res.status(400).json({ message: "At least one wishlist item is required" });
      }

      const wishlist = await storage.createOrUpdateWishlist(
        req.user.id,
        trimmedItem1 || undefined,
        trimmedItem2 || undefined,
        trimmedItem3 || undefined
      );

      await storage.updateUserWishlistStatus(req.user.id, true);

      const updatedUser = await storage.getUser(req.user.id);

      res.json({ wishlist, user: updatedUser });
    } catch (error) {
      console.error("Save wishlist error:", error);
      res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  // Get current user's assignment (who they're buying for)
  app.post("/api/my-assignment", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignmentByGiverId(req.user.id);
      res.json(assignment || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  // Shuffle Secret Santa assignments (admin only)
  app.post("/api/shuffle", requireAuth, requireAdmin, async (req, res) => {
    try {
      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Shuffle has already been completed. Reset first to shuffle again." });
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

      const ids = participants.map(p => p.id);
      const receivers = [...ids];

      // Sattolo's algorithm for derangement
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i); // j < i
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
  app.post("/api/reset", requireAuth, requireAdmin, async (req, res) => {
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
