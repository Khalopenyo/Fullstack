import { apiFetch } from "./api";

export async function uploadPerfumeImage(perfumeId, file) {
  if (!perfumeId) throw new Error("Сначала укажи ID товара (например p-01)");
  if (!file) throw new Error("Нет файла");

  const form = new FormData();
  form.append("file", file);

  return apiFetch(`/api/uploads/perfumes/${encodeURIComponent(perfumeId)}`, {
    method: "POST",
    body: form,
  });
}
