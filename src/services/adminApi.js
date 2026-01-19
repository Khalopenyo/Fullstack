import { apiFetch } from "./api";

export function listOrders() {
  return apiFetch("/api/orders");
}

export function updateOrder(orderId, fulfilled) {
  return apiFetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify({ fulfilled: Boolean(fulfilled) }),
  });
}

export function deleteOrder(orderId) {
  return apiFetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
}

export function listUsers() {
  return apiFetch("/api/users");
}
