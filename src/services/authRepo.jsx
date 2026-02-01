import { apiFetch, clearToken, setToken } from "./api";

export async function login(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) setToken(data.token);
  return data?.user;
}

export async function register(email, password, displayName) {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
  if (data?.token) setToken(data.token);
  return data?.user;
}

export async function guest() {
  const data = await apiFetch("/api/auth/guest", { method: "POST" });
  if (data?.token) setToken(data.token);
  return data?.user;
}

export async function me() {
  return apiFetch("/api/auth/me");
}

export async function refresh() {
  const data = await apiFetch("/api/auth/refresh", { method: "POST" });
  if (data?.token) setToken(data.token);
  return data?.user;
}

export async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore logout errors
  } finally {
    clearToken();
  }
}

export function signOut() {
  clearToken();
}
