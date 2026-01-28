import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";

export default function PaymentPage() {
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — оплата",
      description: "Способы оплаты и подтверждение заказа.",
    });
    setCanonical(window.location.origin + "/payment");
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
          <h1 className="text-lg font-semibold">Оплата</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: THEME.muted }}>
            Способ оплаты подтверждаем в переписке после оформления заказа. Доступны удобные варианты,
            которые согласуются с клиентом. Мы всегда уточняем детали перед отправкой.
          </p>
          <div className="mt-4 text-sm" style={{ color: THEME.muted }}>
            Если нужен счет для оптового заказа — сообщи менеджеру при оформлении.
          </div>
        </div>
      </div>
    </div>
  );
}
