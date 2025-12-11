import {
  users,
  wishlistItems,
  assignments,
  appState,
  type User,
  type InsertUser,
  type Wishlist,
  type InsertWishlist,
  type Assignment,
  type AppState,
  type UserWithWishlist,
  type AssignmentWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserWishlistStatus(id: number, completed: boolean): Promise<void>;

  // Participant methods (excluding admins)
  getAllParticipants(): Promise<UserWithWishlist[]>;

  // Wishlist methods
  getWishlistByUserId(userId: number): Promise<Wishlist | undefined>;
  createOrUpdateWishlist(
    userId: number,
    item1?: string,
    item2?: string,
    item3?: string
  ): Promise<Wishlist>;

  // Assignment methods
  getAssignmentByGiverId(
    giverId: number
  ): Promise<AssignmentWithDetails | undefined>;
  createAssignment(giverId: number, receiverId: number): Promise<Assignment>;
  deleteAllAssignments(): Promise<void>;

  // App state methods
  getAppState(): Promise<AppState>;
  setShuffleCompleted(completed: boolean): Promise<void>;

  sessionStore: session.Store;

  // New: get all users (including admin)
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: "session",
      schemaName: "public",
      createTableIfMissing: false, // We create it ourselves in db.ts
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // insertUser.role is NOT allowed (admin cannot be created manually)
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, role: "participant" })
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Prevent deleting the fixed admin
    const user = await this.getUser(id);
    if (user?.role === "admin") {
      throw new Error("Admin user cannot be deleted.");
    }

    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserWishlistStatus(id: number, completed: boolean): Promise<void> {
    await db
      .update(users)
      .set({ wishlistCompleted: completed })
      .where(eq(users.id, id));
  }

  async getAllParticipants(): Promise<UserWithWishlist[]> {
    const participantsData = await db.query.users.findMany({
      where: eq(users.role, "participant"),
      with: {
        wishlist: true,
      },
    });
    return participantsData as UserWithWishlist[];
  }

  // New helper to retrieve all users (admin + participants)
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async getWishlistByUserId(
    userId: number
  ): Promise<Wishlist | undefined> {
    const [wishlist] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId));
    return wishlist || undefined;
  }

  async createOrUpdateWishlist(
    userId: number,
    item1?: string,
    item2?: string,
    item3?: string
  ): Promise<Wishlist> {
    const existing = await this.getWishlistByUserId(userId);

    if (existing) {
      const [updated] = await db
        .update(wishlistItems)
        .set({ item1, item2, item3 })
        .where(eq(wishlistItems.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(wishlistItems)
        .values({ userId, item1, item2, item3 })
        .returning();
      return created;
    }
  }

  async getAssignmentByGiverId(
    giverId: number
  ): Promise<AssignmentWithDetails | undefined> {
    const result = await db.query.assignments.findFirst({
      where: eq(assignments.giverId, giverId),
    });

    if (!result) return undefined;

    const receiver = await db.query.users.findFirst({
      where: eq(users.id, result.receiverId),
      with: {
        wishlist: true,
      },
    });

    if (!receiver) return undefined;

    return {
      ...result,
      receiver: receiver as User & { wishlist: Wishlist | null },
    };
  }

  async createAssignment(
    giverId: number,
    receiverId: number
  ): Promise<Assignment> {
    const [assignment] = await db
      .insert(assignments)
      .values({ giverId, receiverId })
      .returning();
    return assignment;
  }

  async deleteAllAssignments(): Promise<void> {
    await db.delete(assignments);
  }

  async getAppState(): Promise<AppState> {
    let [state] = await db.select().from(appState);

    if (!state) {
      [state] = await db
        .insert(appState)
        .values({ shuffleCompleted: false })
        .returning();
    }

    return state;
  }

  async setShuffleCompleted(completed: boolean): Promise<void> {
    const state = await this.getAppState();
    await db
      .update(appState)
      .set({ shuffleCompleted: completed })
      .where(eq(appState.id, state.id));
  }
}

export const storage = new DatabaseStorage();
