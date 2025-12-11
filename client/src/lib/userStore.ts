/**
 * Simple global user store (no sessions).
 * Used by queryClient to inject x-user-id automatically.
 */

let currentUser: any = null;

export function setCurrentUser(user: any) {
  currentUser = user;
}

export function clearCurrentUser() {
  currentUser = null;
}

export function getCurrentUser() {
  return currentUser;
}
