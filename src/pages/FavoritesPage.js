import React, { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useShop } from "../state/shop";
import { THEME } from "../data/theme";
import PerfumeCard from "../components/PerfumeCard";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, addToCart, perfumes } = useShop();
  const [volumeById, setVolumeById] = React.useState({});
  const getVolume = (id, baseVolume) => (volumeById[id] != null ? volumeById[id] : (Number(baseVolume) || 50));
  const setVolume = (id, v) => setVolumeById((prev) => ({ ...prev, [id]: Number(v) || 50 }));

  // Находим парфюмы по ID из избранного
  const favPerfumes = useMemo(() => {
    return (perfumes || []).filter((p) => favorites.includes(p.id));
  }, [favorites]);

  return (
    <main
      className="min-h-screen px-4 py-8"
      style={{ background: THEME.bg, color: THEME.text }}
    >
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Избранное</h1>
          <p className="text-sm mt-1" style={{ color: THEME.muted }}>
            Сохраняй ароматы, чтобы вернуться к ним позже
          </p>
        </div>

        <Link
          to="/"
          className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
        >
          ← В каталог
        </Link>
      </header>

      {favPerfumes.length === 0 ? (
        <div
          className="mt-10 rounded-3xl border p-6 text-center"
          style={{ borderColor: THEME.border2, background: THEME.surface2 }}
        >
          <div className="text-lg font-semibold">Нет избранных ароматов</div>
          <p className="mt-2 text-sm" style={{ color: THEME.muted }}>
            Добавь понравившиеся ароматы из каталога 💎
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {favPerfumes.map((perfume) => (
            <PerfumeCard
              key={perfume.id}
              perfume={perfume}
              score={0}
              liked={true}
              onLike={() => toggleFavorite(perfume.id)}
              onDetails={() => navigate(`/perfumes/${perfume.id}`)}
              volume={getVolume(perfume.id, perfume.baseVolume)}
              onVolumeChange={(v) => setVolume(perfume.id, v)}
              onAddToCart={() => addToCart(perfume.id, getVolume(perfume.id, perfume.baseVolume), 1)}
            />
          ))}
        </div>
      )}

      <footer
        className="mt-10 border-t pt-6 text-xs"
        style={{ borderColor: THEME.border2, color: THEME.muted2 }}
      >
        © {new Date().getFullYear()} Aroma Atelier
      </footer>
    </main>
  );
}
