import { apiFetch } from "./api";

// Пишем сырые события в бэк, не ломая UX при ошибке.
export async function logStatEvent({ perfumeId, type }) {
  try {
    if (!perfumeId) return;
    const safeType = typeof type === "string" ? type : "view";
    await apiFetch("/api/stats", {
      method: "POST",
      body: JSON.stringify({ perfumeId, type: safeType }),
    });
  } catch (e) {
    console.warn("logStatEvent failed", e);
  }
}
