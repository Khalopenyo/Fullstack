import { apiFetch } from "./api";

export function listOrders({ page = 1, pageSize = 20, channel = "all", fulfilled } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (channel && channel !== "all") params.set("channel", channel);
  if (typeof fulfilled === "boolean") params.set("fulfilled", String(fulfilled));
  return apiFetch(`/api/orders?${params.toString()}`);
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

export function listUsers({ page = 1, pageSize = 20, q = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (q) params.set("q", q);
  return apiFetch(`/api/users?${params.toString()}`);
}

export function listStock({ q = "", includeUnlimited = true, low = 5, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("includeUnlimited", String(Boolean(includeUnlimited)));
  params.set("low", String(low));
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return apiFetch(`/api/stock?${params.toString()}`);
}

export function updateStock(id, stockQty) {
  if (!id) throw new Error("id обязателен");
  return apiFetch(`/api/stock/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ stockQty }),
  });
}

export function listPresets() {
  return apiFetch("/api/presets");
}

export function savePreset(preset) {
  const id = preset?.id;
  const payload = {
    title: preset?.title || "",
    subtitle: preset?.subtitle || "",
    notes: preset?.notes || "",
    groups: Array.isArray(preset?.groups) ? preset.groups : [],
  };
  if (id) {
    return apiFetch(`/api/presets/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return apiFetch("/api/presets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePreset(presetId) {
  return apiFetch(`/api/presets/${encodeURIComponent(presetId)}`, { method: "DELETE" });
}

export function setUserAdmin(userId, isAdmin) {
  return apiFetch(`/api/users/${encodeURIComponent(userId)}/admin`, {
    method: "PUT",
    body: JSON.stringify({ isAdmin: Boolean(isAdmin) }),
  });
}

export function deleteUser(userId) {
  return apiFetch(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
