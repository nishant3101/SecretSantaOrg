import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const ADMIN_ROUTES = [
  { method: "POST", prefix: "/api/participants" },
  { method: "DELETE", prefix: "/api/participants" },
  { method: "POST", prefix: "/api/shuffle" },
  { method: "POST", prefix: "/api/reset" },
];

export async function apiRequest(method: string, url: string, data?: any) {
  const headers: any = {
    "Content-Type": "application/json",
  };

  // Auto-attach admin secret when calling admin-only routes
  const isAdminRoute = ADMIN_ROUTES.some(
    (r) => r.method === method && url.startsWith(r.prefix)
  );

  if (isAdminRoute) {
    headers["x-admin-secret"] = process.env.NEXT_PUBLIC_ADMIN_SECRET!;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) errorMessage = body.error;
    } catch {}

    throw new Error(errorMessage);
  }

  return res;
}
