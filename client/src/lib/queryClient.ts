import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // ensure cookies/sessions work
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
