import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertUserSchema, updateWishlistSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Get app state (shuffle status)
  app.get("/api/app-state", requireAuth, async (req, res) => {
    try {
      const state = await storage.getAppState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: "Failed to get app state" });
    }
  });

  // Get all participants (admin only)
  app.get("/api/participants", requireAdmin, async (req, res) => {
    try {
      const participants = await storage.getAllParticipants();
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  // Create a new participant (admin only)
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

      // Check if shuffle already completed - can't add new participants after shuffle
      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Cannot add participants after shuffle. Reset first." });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        role: "participant",
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("Create participant error:", error);
      res.status(500).json({ message: "Failed to create participant" });
    }
  });

  // Delete a participant (admin only)
  app.delete("/api/participants/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if shuffle already completed - can't delete participants after shuffle
      const state = await storage.getAppState();
      if (state.shuffleCompleted) {
        return res.status(400).json({ message: "Cannot delete participants after shuffle. Reset first." });
      }
      
      // Prevent admin from deleting themselves
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      await storage.deleteUser(id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete participant error:", error);
      res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  // Get current user's wishlist
  app.get("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const wishlist = await storage.getWishlistByUserId(req.user!.id);
      res.json(wishlist || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  // Save/update current user's wishlist
  app.post("/api/my-wishlist", requireAuth, async (req, res) => {
    try {
      const { item1, item2, item3 } = req.body;
      
      // Validate that at least one item is provided
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

      // Mark wishlist as completed since at least one item is provided
      await storage.updateUserWishlistStatus(req.user!.id, true);

      // Refresh user data
      const updatedUser = await storage.getUser(req.user!.id);
      
      res.json({ wishlist, user: updatedUser });
    } catch (error) {
      console.error("Save wishlist error:", error);
      res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  // Get current user's assignment (who they're buying for)
  app.get("/api/my-assignment", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignmentByGiverId(req.user!.id);
      res.json(assignment || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  // Shuffle Secret Santa assignments (admin only)
  app.post("/api/shuffle", requireAdmin, async (req, res) => {
    try {
      // Check if already shuffled
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

      // Clear existing assignments (safety measure)
      await storage.deleteAllAssignments();

      // Use Sattolo's algorithm for guaranteed derangement
      const ids = participants.map(p => p.id);
      const receivers = [...ids];
      
      // Sattolo's algorithm - guaranteed derangement
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i); // Note: j < i, not j <= i
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      // Create assignments
      for (let i = 0; i < ids.length; i++) {
        await storage.createAssignment(ids[i], receivers[i]);
      }

      // Mark shuffle as completed
      await storage.setShuffleCompleted(true);

      res.json({ message: "Shuffle completed successfully" });
    } catch (error) {
      console.error("Shuffle error:", error);
      res.status(500).json({ message: "Failed to shuffle" });
    }
  });

  // Reset shuffle (admin only)
  app.post("/api/reset", requireAdmin, async (req, res) => {
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
