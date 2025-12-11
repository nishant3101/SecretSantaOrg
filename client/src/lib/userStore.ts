export function setCurrentUser(user) {
  localStorage.setItem("ss-user", JSON.stringify(user));
}

export function getCurrentUser() {
  const raw = localStorage.getItem("ss-user");
  return raw ? JSON.parse(raw) : null;
}

export function clearCurrentUser() {
  localStorage.removeItem("ss-user");
}
