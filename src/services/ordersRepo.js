import { collection, doc, serverTimestamp, writeBatch, increment } from "firebase/firestore";
import { db } from "../firebase/firebase";

function buildOrderItems(items) {
  return (items || []).map((x) => ({
    id: x.id,
    volume: Number(x.volume) || 0,
    qty: Number(x.qty) || 0,
    price: Number(x.unit) || 0,
  }));
}

export async function createOrder({ user, items, total, channel }) {
  const uid = user?.uid || null;
  if (!uid) throw new Error("no uid");

  const currency = items?.[0]?.perfume?.currency || "₽";
  const payload = {
    uid,
    isAnonymous: Boolean(user?.isAnonymous),
    items: buildOrderItems(items),
    total: Number(total) || 0,
    currency,
    channel: String(channel || ""),
    createdAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  const orderRef = doc(collection(db, "orders"));
  batch.set(orderRef, payload);

  const counts = new Map();
  for (const row of payload.items) {
    if (!row?.id) continue;
    const prev = counts.get(row.id) || 0;
    counts.set(row.id, prev + (Number(row.qty) || 0));
  }

  for (const [id, qty] of counts.entries()) {
    const ref = doc(db, "perfumes", id);
    batch.set(ref, { orderCount: increment(qty) }, { merge: true });
  }

  await batch.commit();
}
