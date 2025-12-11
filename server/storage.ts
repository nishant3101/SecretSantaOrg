// server/storage.ts
import { User, Wishlist, Assignment, AppState } from "@shared/schema";

type Database = {
  users: User[];
  wishlists: Wishlist[];
  assignments: Assignment[];
  appState: AppState;
};

class Storage {
  private db: Database = {
    users: [],
    wishlists: [],
    assignments: [],
    appState: {
      shuffleCompleted: false,
    },
  };

  // --- USERS ---
  async createUser(user: User) {
    this.db.users.push(user);
    return user;
  }

  async getUserByUsername(username: string) {
    return this.db.users.find(u => u.username === username) || null;
  }

  async deleteUser(id: number) {
    this.db.users = this.db.users.filter(u => u.id !== id);
  }

  async getAllUsers() {
    return this.db.users;
  }

  // --- WISHLISTS ---
  async saveWishlist(wishlist: Wishlist) {
    const existing = this.db.wishlists.find(w => w.userId === wishlist.userId);
    if (existing) {
      Object.assign(existing, wishlist);
    } else {
      this.db.wishlists.push(wishlist);
    }
    return wishlist;
  }

  async getWishlist(userId: number) {
    return this.db.wishlists.find(w => w.userId === userId) || null;
  }

  // --- APP STATE ---
  async updateAppState(state: Partial<AppState>) {
    Object.assign(this.db.appState, state);
    return this.db.appState;
  }

  async getAppState() {
    return this.db.appState;
  }

  // --- ASSIGNMENTS ---
  async saveAssignments(assignments: Assignment[]) {
    this.db.assignments = assignments;
  }

  async getAssignmentForUser(userId: number) {
    return this.db.assignments.find(a => a.giverId === userId) || null;
  }
}

export const storage = new Storage();
