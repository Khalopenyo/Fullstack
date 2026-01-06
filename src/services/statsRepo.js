import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// Пишем сырые события в Firestore. Дальше Cloud Functions (или другая бэковая логика)
// агрегируют их в поля popularity/popularityMonth у товаров.
//
// Важно: этот вызов не должен ломать UX — поэтому мы глотаем ошибки.
export async function logStatEvent({ perfumeId, type }) {
  try {
    if (!perfumeId) return;
    const safeType = typeof type === "string" ? type : "view";
    await addDoc(collection(db, "stat_events"), {
      perfumeId,
      type: safeType,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("logStatEvent failed", e);
  }
}
