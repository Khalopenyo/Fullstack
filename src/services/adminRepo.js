import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function isAdminUid(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
