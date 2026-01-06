import { scorePerfume } from "./scoring";

export function computeCatalog({ perfumes, q, mustNotes, avoidNotes, seasons, dayNight, sort }) {
  const query = (q || "").trim().toLowerCase();

  const raw = perfumes
    .map((p) => ({ perfume: p, score: scorePerfume(p, mustNotes, avoidNotes, seasons, dayNight) }))
    .filter(({ perfume }) => {
      if (!query) return true;
      const hay = [
        perfume.brand,
        perfume.name,
        perfume.family,
        perfume.description,
        ...(perfume.tags || []),
        ...perfume.notes.top,
        ...perfume.notes.heart,
        ...perfume.notes.base,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });

  const minScore = mustNotes.length ? 1 : -999;
  const filtered = raw.filter((x) => x.score >= minScore);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "match") return b.score - a.score;
    if (sort === "popular") {
      const d = (b.perfume.popularity || 0) - (a.perfume.popularity || 0);
      return d !== 0 ? d : b.score - a.score;
    }
    if (sort === "popular_month") {
      const d = (b.perfume.popularityMonth || 0) - (a.perfume.popularityMonth || 0);
      return d !== 0 ? d : (b.perfume.popularity || 0) - (a.perfume.popularity || 0);
    }
    if (sort === "price_asc") return a.perfume.price - b.perfume.price;
    if (sort === "price_desc") return b.perfume.price - a.perfume.price;
    if (sort === "longevity") return b.perfume.longevity - a.perfume.longevity;
    if (sort === "sillage") return b.perfume.sillage - a.perfume.sillage;
    return b.score - a.score;
  });

  return { total: sorted.length, items: sorted };
}
