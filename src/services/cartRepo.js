import { apiFetch } from "./api";

export async function loadCart(uid) {
  if (!uid) return { items: [] };
  return apiFetch("/api/cart");
}

export async function saveCart(uid, items) {
  if (!uid) return;
  await apiFetch("/api/cart", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}
