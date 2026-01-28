import React, { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { MIX_OPTIONS, VOLUME_OPTIONS } from "../data/perfumes";
import { priceForVolume } from "../lib/scoring";
import { clearJsonLd, setCanonical, setJsonLd, setMeta, setOpenGraphImage } from "../lib/seo";
import { useShop } from "../state/shop";
import SafeImage from "../components/SafeImage";

export default function PerfumePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { perfumesById, loadingPerfumes, favorites, toggleFavorite, addToCart } = useShop();

  const perfume = useMemo(() => (id ? perfumesById[id] : null), [id, perfumesById]);
  const [volume, setVolume] = React.useState(50);
  const [mix, setMix] = React.useState("60/40");

  React.useEffect(() => {
    if (perfume) setVolume(Number(perfume.baseVolume) || 50);
  }, [perfume]);

  React.useEffect(() => {
    if (!perfume) return;
    const title = `${perfume.brand} — ${perfume.name} | Bakhur`;
    const desc =
      perfume.description ||
      `Аромат ${perfume.brand} ${perfume.name}. Масляные духи с подбором по нотам, сезонам и времени дня.`;
    setMeta({ title, description: desc });
    const absoluteImage = perfume.image
      ? perfume.image.startsWith("http")
        ? perfume.image
        : window.location.origin + perfume.image
      : "";
    setCanonical(window.location.origin + `/perfumes/${perfume.id}`);
    setOpenGraphImage(absoluteImage || (window.location.origin + "/logo192.png"));

    const productLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${perfume.brand} ${perfume.name}`,
      description: desc,
      image: absoluteImage ? [absoluteImage] : undefined,
      sku: perfume.id,
      brand: {
        "@type": "Brand",
        name: perfume.brand || "Bakhur",
      },
      offers: {
        "@type": "Offer",
        price: price,
        priceCurrency: perfume.currency || "RUB",
        availability: perfume.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    };
    setJsonLd("jsonld-product", productLd);
    return () => clearJsonLd("jsonld-product");
  }, [perfume, price]);

  if (loadingPerfumes && !perfume) {
    return (
      <div className="min-h-screen p-6" style={{ background: THEME.bg, color: THEME.text }}>
        <div className="mx-auto max-w-3xl text-sm opacity-70">Загрузка аромата...</div>
      </div>
    );
  }

  if (!perfume) {
    return (
      <div className="min-h-screen p-6" style={{ background: THEME.bg, color: THEME.text }}>
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="text-sm underline" style={{ color: THEME.muted2 }}>
            ← В каталог
          </Link>
          <div className="mt-6 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
            <div className="text-lg font-semibold">Аромат не найден</div>
            <p className="mt-2 text-sm" style={{ color: THEME.muted }}>
              Проверь ссылку или вернись в каталог.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const liked = favorites.includes(perfume.id);
  const price = priceForVolume(perfume.basePrice ?? perfume.price, volume, perfume.baseVolume, mix);

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm underline" style={{ color: THEME.muted2 }}>
            ← В каталог
          </Link>
          <Link to="/cart" className="text-sm underline" style={{ color: THEME.muted2 }}>
            Корзина →
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[340px_1fr]">
          <div className="rounded-3xl border p-4" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border2 }}>
              <SafeImage
                src={perfume.image}
                alt={perfume.brand + " " + perfume.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide" style={{ color: THEME.muted2 }}>
                {perfume.brand}
              </div>
              <h1 className="mt-1 text-xl font-semibold">{perfume.name}</h1>

              <div className="mt-4">
                <div className="text-xs" style={{ color: THEME.muted2 }}>
                  Объём
                </div>
                <select
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border px-3 py-3 text-sm"
                  style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.03)", color: THEME.text }}
                >
                  {VOLUME_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v} мл
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3">
                <div className="text-xs" style={{ color: THEME.muted2 }}>
                  Пропорции
                </div>
                <select
                  value={mix}
                  onChange={(e) => setMix(e.target.value)}
                  className="mt-1 w-full rounded-2xl border px-3 py-3 text-sm"
                  style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.03)", color: THEME.text }}
                >
                  {MIX_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: THEME.border2 }}>
                <div className="text-xs" style={{ color: THEME.muted2 }}>
                  Цена
                </div>
                <div className="text-lg font-semibold">{price} {perfume.currency || "₽"}</div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-full px-5 py-3 text-sm font-semibold"
                  style={{ background: THEME.accent, color: "#0B0B0F" }}
                  onClick={() => {
                    addToCart(perfume.id, volume, 1, mix);
                  }}
                >
                  В корзину
                </button>

                <button
                  type="button"
                  className="flex-1 rounded-full border px-5 py-3 text-sm"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  onClick={() => toggleFavorite(perfume.id)}
                >
                  {liked ? "Убрать" : "В избранное"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
            <div className="text-lg font-semibold">Описание</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: THEME.muted }}>
              {perfume.description || "Описание пока не заполнено."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-4" style={{ borderColor: THEME.border2 }}>
                <div className="text-xs" style={{ color: THEME.muted2 }}>
                  Ноты
                </div>
                <div className="mt-2 text-sm" style={{ color: THEME.text }}>
                  {[...perfume.notes.top, ...perfume.notes.heart, ...perfume.notes.base].slice(0, 18).join(", ") || "—"}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: THEME.border2 }}>
                <div className="text-xs" style={{ color: THEME.muted2 }}>
                  Сезоны / Время
                </div>
                <div className="mt-2 text-sm" style={{ color: THEME.text }}>
                  {(perfume.seasons || []).join(", ") || "—"} / {(perfume.dayNight || []).join(", ") || "—"}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="rounded-full border px-5 py-3 text-sm"
                style={{ borderColor: THEME.border2, color: THEME.text }}
                onClick={() => navigate("/favorites")}
              >
                Перейти в избранное
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
