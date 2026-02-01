import { apiFetch } from "./api";

export async function isAdminUid() {
  const me = await apiFetch("/api/auth/me");
  return Boolean(me?.isAdmin);
}
