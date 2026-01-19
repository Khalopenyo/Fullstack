import { apiFetch } from "./api";

export function listenReviews(perfumeId, onData, onError) {
  if (!perfumeId) return () => {};
  let alive = true;

  const fetchOnce = async () => {
    try {
      const list = await apiFetch(`/api/reviews/${encodeURIComponent(perfumeId)}`);
      if (alive) onData?.(Array.isArray(list) ? list : []);
    } catch (err) {
      if (alive) onError?.(err);
    }
  };

  fetchOnce();
  const id = setInterval(fetchOnce, 8000);

  return () => {
    alive = false;
    clearInterval(id);
  };
}

export async function upsertReview(perfumeId, reviewId, data) {
  if (!perfumeId || !reviewId) return;
  return apiFetch(`/api/reviews/${encodeURIComponent(perfumeId)}/${encodeURIComponent(reviewId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReview(perfumeId, reviewId) {
  if (!perfumeId || !reviewId) return;
  return apiFetch(`/api/reviews/${encodeURIComponent(perfumeId)}/${encodeURIComponent(reviewId)}`, { method: "DELETE" });
}

export async function computeReviewSummary(perfumeId) {
  if (!perfumeId) return { avg: 0, count: 0 };
  return apiFetch(`/api/reviews/${encodeURIComponent(perfumeId)}/summary`);
}
