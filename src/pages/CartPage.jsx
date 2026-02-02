import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import SafeImage from "../components/SafeImage";
import CheckoutModal from "../components/CheckoutModal";
import { useShop } from "../state/shop";
import { priceForVolume } from "../lib/scoring";
import { setCanonical, setMeta, setOpenGraphImage, setRobots } from "../lib/seo";

export default function CartPage() {
  const { cart, removeFromCart, setQty, perfumesById } = useShop();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — корзина",
      description: "Проверь выбранные ароматы и оформи заказ.",
    });
    setCanonical(window.location.origin + "/cart");
    setOpenGraphImage(window.location.origin + "/logo192.png");
    setRobots("noindex,follow");
  }, []);

  const items = useMemo(() => {
    return cart
      .map((row) => {
        const perfume = perfumesById[row.id];
        if (!perfume) {
          return {
            ...row,
            perfume: { id: row.id, brand: "—", name: "Товар не найден", basePrice: 0, baseVolume: 50, image: "" },
            unit: 0,
            sum: 0,
          };
        }
        const unit = priceForVolume(perfume.basePrice ?? perfume.price, row.volume, perfume.baseVolume, row.mix);
        const sum = unit * row.qty;
        return { ...row, perfume, unit, sum };
      })
      .filter(Boolean);
  }, [cart, perfumesById]);

  const total = items.reduce((acc, x) => acc + x.sum, 0);

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Корзина</div>
            <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
              
            </div>
          </div>

          <Link
            to="/"
            className="w-full sm:w-auto rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            ← В каталог
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
            <div className="text-lg font-semibold">Пока пусто</div>
            <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
              Добавь аромат из каталога — и он появится здесь.
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {items.map((x) => (
                <div
                  key={x.id + "-" + x.volume + "-" + (x.mix || "60/40")}
                  className="rounded-3xl border p-4"
                  style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="overflow-hidden rounded-2xl border"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                          width: 80,
                          height: 80,
                          flexShrink: 0,
                        }}
                      >
                        <SafeImage
                          src={x.perfume.image}
                          alt={x.perfume.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>

                      <div>
                        <div className="text-xs" style={{ color: THEME.muted }}>
                          {x.perfume.brand}
                        </div>
                        <div className="mt-1 text-lg font-semibold">{x.perfume.name}</div>
                        <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                          {x.volume} мл · {x.mix || "60/40"} · {x.unit}{x.perfume.currency || "₽"} / шт
                        </div>
                      </div>
                    </div>

                    <button
                      className="w-full sm:w-auto rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                      style={{ borderColor: THEME.border2, color: THEME.text }}
                      onClick={() => removeFromCart(x.id, x.volume, x.mix)}
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: THEME.muted }}>
                        Кол-во:
                      </span>
                      <button
                        className="h-9 w-9 rounded-full border hover:bg-white/[0.06]"
                        style={{ borderColor: THEME.border2, color: THEME.text }}
                        onClick={() => setQty(x.id, x.volume, x.qty - 1, x.mix)}
                      >
                        −
                      </button>
                      <span className="min-w-[36px] text-center text-sm">{x.qty}</span>
                      <button
                        className="h-9 w-9 rounded-full border hover:bg-white/[0.06]"
                        style={{ borderColor: THEME.border2, color: THEME.text }}
                        onClick={() => setQty(x.id, x.volume, x.qty + 1, x.mix)}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Сумма
                      </div>
                      <div className="text-lg font-semibold">
                        {x.sum}{x.perfume.currency}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border p-5" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm" style={{ color: THEME.muted }}>
                  Итого
                </div>
                <div className="text-2xl font-semibold">{total}{items[0]?.perfume?.currency || "₽"}</div>
              </div>
              <button
                className="mt-4 w-full rounded-full px-5 py-3 text-sm font-semibold"
                style={{ background: THEME.accent, color: "#0B0B0F" }}
                onClick={() => setCheckoutOpen(true)}
              >
                Оформить заказ
              </button>
            </div>
          </>
        )}

      <CheckoutModal open={checkoutOpen} items={items} total={total} onClose={() => setCheckoutOpen(false)} />

      </div>
    </div>
  );
}
