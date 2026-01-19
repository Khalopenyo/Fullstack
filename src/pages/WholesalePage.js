import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";
import { fetchCatalogWithDiagnostics } from "../services/perfumesRepo";

const WHOLESALE_TIERS = [
  { minLiters: 2, price: 15000 },
  { minLiters: 1, price: 10000 },
];

function calcWholesalePrice(liters) {
  const v = Number(liters) || 0;
  for (const tier of WHOLESALE_TIERS) {
    if (v >= tier.minLiters) return tier.price;
  }
  return 0;
}

export default function WholesalePage() {
  const [liters, setLiters] = React.useState(1);
  const price = calcWholesalePrice(liters);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setMeta({
      title: "Bakhur — оптовый каталог",
      description: "Оптовый каталог масляных ароматов: калькулятор цены по объему и условия для оптовиков.",
    });
    setCanonical(window.location.origin + "/wholesale");
    setOpenGraphImage(window.location.origin + "/logo192.png");
  }, []);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchCatalogWithDiagnostics("wholesale_perfumes")
      .then(({ perfumes }) => {
        if (!alive) return;
        setItems(Array.isArray(perfumes) ? perfumes : []);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ borderColor: THEME.border2, background: "rgba(12,12,16,0.72)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold" style={{ letterSpacing: 0.2 }}>
              Оптовый каталог
            </div>
            <div className="text-xs" style={{ color: THEME.muted }}>
              Цены для крупных объёмов
            </div>
          </div>
          <Link
            to="/"
            className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            ← В розницу
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border p-5" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
          <div className="text-lg font-semibold">Калькулятор оптовой цены</div>
          <p className="mt-2 text-sm" style={{ color: THEME.muted }}>
            Выбери объём масла в литрах — цена подставится автоматически.
          </p>

          <div className="mt-4">
            <label className="text-xs" style={{ color: THEME.muted2 }}>
              Объём, литры
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              className="mt-2 w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
              style={{ borderColor: THEME.border2, color: THEME.text }}
            />
          </div>

          <div className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: THEME.border2 }}>
            <div className="text-xs" style={{ color: THEME.muted2 }}>
              Цена
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {price.toLocaleString("ru-RU")} ₽
            </div>
            {Number(liters) < 1 ? (
              <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                Минимальный объём: 1 л
              </div>
            ) : null}
          </div>

          <div className="mt-4 text-xs" style={{ color: THEME.muted }}>
            Тарифы: 1 л — 10 000 ₽, 2 л и больше — 15 000 ₽.
          </div>
        </section>

        <section className="rounded-3xl border p-5" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
          <div className="text-lg font-semibold">Оптовый каталог</div>
          <p className="mt-2 text-sm" style={{ color: THEME.muted }}>
            Актуальные позиции для оптовых заказов.
          </p>
          <div className="mt-4">
            {loading ? (
              <div className="text-sm" style={{ color: THEME.muted }}>
                Загрузка...
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm" style={{ color: THEME.muted }}>
                Нет товаров
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="overflow-hidden rounded-2xl border"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                          width: 88,
                          height: 88,
                          flexShrink: 0,
                        }}
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.brand + " " + p.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs" style={{ color: THEME.muted }}>
                            Нет фото
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs" style={{ color: THEME.muted }}>
                          {p.brand}
                        </div>
                        <div className="mt-1 text-base font-semibold" style={{ color: THEME.text }}>
                          {p.name}
                        </div>
                        {p.description ? (
                          <div className="mt-2 text-xs" style={{ color: THEME.muted }}>
                            {p.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
