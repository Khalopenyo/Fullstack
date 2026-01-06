import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function loadCart(uid) {
  const ref = doc(db, "carts", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { items: [] };
}

export async function saveCart(uid, items) {
  const ref = doc(db, "carts", uid);
  await setDoc(ref, { items, updatedAt: serverTimestamp() }, { merge: true });
}
