import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

export function listenReviews(perfumeId, onData, onError) {
  if (!perfumeId) return () => {};
  const q = query(collection(db, "perfumes", perfumeId, "reviews"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData?.(list);
    },
    (err) => onError?.(err)
  );
}

export async function upsertReview(perfumeId, reviewId, data) {
  if (!perfumeId || !reviewId) return;
  const ref = doc(db, "perfumes", perfumeId, "reviews", reviewId);
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (!data?.createdAt) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: true });
}

export async function deleteReview(perfumeId, reviewId) {
  if (!perfumeId || !reviewId) return;
  await deleteDoc(doc(db, "perfumes", perfumeId, "reviews", reviewId));
}

export async function computeReviewSummary(perfumeId) {
  if (!perfumeId) return { avg: 0, count: 0 };
  const snap = await getDocs(collection(db, "perfumes", perfumeId, "reviews"));
  let sum = 0;
  let count = 0;
  snap.forEach((d) => {
    const r = d.data() || {};
    const v = Number(r.rating || 0);
    if (v > 0) {
      sum += v;
      count += 1;
    }
  });
  const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
  return { avg, count };
}
