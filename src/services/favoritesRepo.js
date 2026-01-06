import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function loadFavorites(uid) {
  const col = collection(db, "users", uid, "favorites");
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.id); // perfumeId хранится как id документа
}

export async function addFavorite(uid, perfumeId) {
  await setDoc(doc(db, "users", uid, "favorites", perfumeId), { createdAt: Date.now() });
}

export async function removeFavorite(uid, perfumeId) {
  await deleteDoc(doc(db, "users", uid, "favorites", perfumeId));
}
