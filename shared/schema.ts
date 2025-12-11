import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, serial, json, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - supports both admin and participants
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("participant"), // "admin" or "participant"
  wishlistCompleted: boolean("wishlist_completed").notNull().default(false),
});

// Wishlist items table
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  item1: text("item_1"),
  item2: text("item_2"),
  item3: text("item_3"),
});

// Secret Santa assignments table
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  giverId: integer("giver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// App state table to track if shuffle has happened
export const appState = pgTable("app_state", {
  id: serial("id").primaryKey(),
  shuffleCompleted: boolean("shuffle_completed").notNull().default(false),
});

// Session table for express-session + connect-pg-simple
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  wishlist: one(wishlistItems, {
    fields: [users.id],
    references: [wishlistItems.userId],
  }),
  givenAssignment: one(assignments, {
    fields: [users.id],
    references: [assignments.giverId],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  giver: one(users, {
    fields: [assignments.giverId],
    references: [users.id],
    relationName: "giver",
  }),
  receiver: one(users, {
    fields: [assignments.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  // note: role intentionally excluded to prevent client-side role assignment
});

export const insertWishlistSchema = createInsertSchema(wishlistItems).pick({
  userId: true,
  item1: true,
  item2: true,
  item3: true,
});

export const updateWishlistSchema = z.object({
  item1: z.string().optional(),
  item2: z.string().optional(),
  item3: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Wishlist = typeof wishlistItems.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AppState = typeof appState.$inferSelect;

// Extended types for frontend use
export type UserWithWishlist = User & { wishlist: Wishlist | null };
export type AssignmentWithDetails = Assignment & { 
  receiver: User & { wishlist: Wishlist | null } 
};
