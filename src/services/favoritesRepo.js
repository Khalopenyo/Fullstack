import { apiFetch } from "./api";

export async function loadFavorites(uid) {
  if (!uid) return [];
  return apiFetch("/api/favorites");
}

export async function addFavorite(uid, perfumeId) {
  if (!uid || !perfumeId) return;
  await apiFetch(`/api/favorites/${encodeURIComponent(perfumeId)}`, { method: "POST" });
}

export async function removeFavorite(uid, perfumeId) {
  if (!uid || !perfumeId) return;
  await apiFetch(`/api/favorites/${encodeURIComponent(perfumeId)}`, { method: "DELETE" });
}
