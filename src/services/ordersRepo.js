import { apiFetch } from "./api";

function buildOrderItems(items) {
  return (items || []).map((x) => ({
    id: x.id,
    volume: Number(x.volume) || 0,
    mix: String(x.mix || "60/40"),
    qty: Number(x.qty) || 0,
    price: Number(x.unit) || 0,
  }));
}

export async function createOrder({ user, items, total, channel, delivery }) {
  const uid = user?.uid || null;
  if (!uid) throw new Error("no uid");

  const currency = items?.[0]?.perfume?.currency || "₽";
  const deliveryMethod = String(delivery?.method || "pickup");
  const deliveryAddress = String(delivery?.address || "").trim();

  const payload = {
    items: buildOrderItems(items),
    total: Number(total) || 0,
    currency,
    channel: String(channel || ""),
    delivery: {
      method: deliveryMethod,
      address: deliveryAddress,
    },
  };

  await apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
