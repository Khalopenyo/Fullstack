import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";

export default function DeliveryPage() {
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — доставка",
      description: "Условия доставки масляных ароматов и сроки получения заказа.",
    });
    setCanonical(window.location.origin + "/delivery");
    setOpenGraphImage(window.location.origin + "/logo192.png");
  }, []);

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm underline" style={{ color: THEME.muted2 }}>
            ← В каталог
          </Link>
        </div>

        <div className="mt-6 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
          <h1 className="text-lg font-semibold">Доставка</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: THEME.muted }}>
            Мы принимаем заказы через мессенджеры и уточняем детали доставки индивидуально. Доступны
            самовывоз и доставка по договоренности. Укажи адрес при оформлении — он попадет в сообщение
            заказа.
          </p>
          <div className="mt-4 text-sm" style={{ color: THEME.muted }}>
            Сроки и стоимость зависят от города и объема заказа. Напиши нам — подскажем лучшие условия.
          </div>
        </div>
      </div>
    </div>
  );
}
