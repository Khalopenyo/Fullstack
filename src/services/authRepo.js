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

export function signOut() {
  clearToken();
}
