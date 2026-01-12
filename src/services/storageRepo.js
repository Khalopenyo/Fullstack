import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadPerfumeImage(perfumeId, file) {
  if (!perfumeId) throw new Error("Сначала укажи ID товара (например p-01)");
  if (!file) throw new Error("Нет файла");

  const safeName = String(file.name || "image").replace(/[^\w.\-]+/g, "_");
  const path = `perfumes/${perfumeId}/${Date.now()}_${safeName}`;

  const r = ref(storage, path);
  await uploadBytes(r, file, {
    cacheControl: "public,max-age=31536000,immutable",
  });
  const url = await getDownloadURL(r);

  return { url, path };
}
