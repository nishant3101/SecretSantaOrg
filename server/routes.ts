// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertUserSchema, updateWishlistSchema } from "@shared/schema";
import { hashPassword } from "./auth"; // not used here but keepable

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup very small auth endpoints (login/logout) — stateless
  setupAuth(app);

  // NOTE: This implementation removes any server-side session checks.
  // The frontend is responsible for storing the logged-in user in memory
  // and showing admin vs participant UI.
  //
  // If you later want per-request protection, we can add a small token that
  // the client includes in Authorization header and server validates.

  // Get app state (shuffle status)
  app.get("/api/app-state", async (_req, res) => {
    try {
      const state = await storage.getAppState();
      return res.json(state);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get app state" });
    }
  });

  // Get all participants (this endpoint is used by admin UI)
  // In the simple mode we do not require authentication on the server.
  app.get("/api/participants", async (_req, res) => {
    try {
      const participants = await storage.getAllParticipants();
      return res.json(participants);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get participants" });
    }
  });

  // Create a new participant (admin UI calls this). Server accepts it without session checks.
  app.post("/api/participants", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== "string" || username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (!password || typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Simple mode: store password as provided (plain text)
      const user = await storage.createUser({
        username,
        password,
        role: "participant",
      });

      return res.status(201).json(user);
    } catch (error) {
      console.error("Create participant error:", error);
      return res.status(500).json({ message: "Failed to create participant" });
    }
  });

  // Delete a participant
  app.delete("/api/participants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

      await storage.deleteUser(id);
      return res.sendStatus(200);
    } catch (error) {
      console.error("Delete participant error:", error);
      return res.status(500).json({ message: "Failed to delete participant" });
    }
  });

  // Get current user's wishlist (frontend will call this for the logged-in user)
  app.get("/api/my-wishlist", async (req, res) => {
    try {
      // In stateless mode the server cannot know who "my" is.
      // The frontend is expected to pass query param ?userId= or similar.
      // For backward compatibility: if user id present in query, use it.
      const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
      if (!userId) {
        return res.status(400).json({ message: "userId query parameter required in stateless mode" });
      }

      const wishlist = await storage.getWishlistByUserId(userId);
      return res.json(wishlist || null);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get wishlist" });
    }
  });

  // Save/update current user's wishlist
  app.post("/api/my-wishlist", async (req, res) => {
    try {
      // stateless: require userId in body
      const { userId, item1, item2, item3 } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });

      const trimmedItem1 = item1?.trim() || "";
      const trimmedItem2 = item2?.trim() || "";
      const trimmedItem3 = item3?.trim() || "";

      if (!trimmedItem1 && !trimmedItem2 && !trimmedItem3) {
        return res.status(400).json({ message: "At least one wishlist item is required" });
      }

      const wishlist = await storage.createOrUpdateWishlist(
        userId,
        trimmedItem1 || undefined,
        trimmedItem2 || undefined,
        trimmedItem3 || undefined
      );

      // Mark wishlist as completed since at least one item is provided
      await storage.updateUserWishlistStatus(userId, true);

      // Refresh user data
      const updatedUser = await storage.getUser(userId);

      return res.json({ wishlist, user: updatedUser });
    } catch (error) {
      console.error("Save wishlist error:", error);
      return res.status(500).json({ message: "Failed to save wishlist" });
    }
  });

  // Get assignment for a giver — stateless: require giverId in query
  app.get("/api/my-assignment", async (req, res) => {
    try {
      const giverId = req.query.giverId ? parseInt(String(req.query.giverId), 10) : undefined;
      if (!giverId) return res.status(400).json({ message: "giverId query parameter required" });

      const assignment = await storage.getAssignmentByGiverId(giverId);
      return res.json(assignment || null);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get assignment" });
    }
  });

  // Shuffle Secret Santa assignments (admin action) — no server auth in simple mode
  app.post("/api/shuffle", async (_req, res) => {
    try {
      const participants = await storage.getAllParticipants();

      if (participants.length < 3) {
        return res.status(400).json({ message: "Need at least 3 participants to shuffle" });
      }

      const allCompleted = participants.every((p) => p.wishlistCompleted);
      if (!allCompleted) {
        return res.status(400).json({ message: "Not all participants have completed their wishlists" });
      }

      // Clear existing assignments
      await storage.deleteAllAssignments();

      const ids = participants.map((p) => p.id);
      const receivers = [...ids];

      // Sattolo's algorithm for derangement
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      for (let i = 0; i < ids.length; i++) {
        await storage.createAssignment(ids[i], receivers[i]);
      }

      await storage.setShuffleCompleted(true);

      return res.json({ message: "Shuffle completed successfully" });
    } catch (error) {
      console.error("Shuffle error:", error);
      return res.status(500).json({ message: "Failed to shuffle" });
    }
  });

  // Reset shuffle
  app.post("/api/reset", async (_req, res) => {
    try {
      await storage.deleteAllAssignments();
      await storage.setShuffleCompleted(false);
      return res.json({ message: "Reset completed" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to reset" });
    }
  });

  return httpServer;
}
