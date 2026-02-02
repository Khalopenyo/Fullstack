import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { clearJsonLd, setCanonical, setJsonLd, setMeta, setOpenGraphImage } from "../lib/seo";

export default function DeliveryPage() {
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — доставка",
      description: "Условия доставки масляных ароматов и сроки получения заказа.",
    });
    setCanonical(window.location.origin + "/delivery");
    setOpenGraphImage(window.location.origin + "/logo192.png");
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Сколько занимает доставка?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Срок зависит от города и выбранного способа доставки. Точные сроки уточняем после оформления заказа.",
          },
        },
        {
          "@type": "Question",
          name: "Сколько стоит доставка?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Стоимость рассчитывается индивидуально и зависит от адреса и объема заказа. Напиши нам — подскажем лучший вариант.",
          },
        },
        {
          "@type": "Question",
          name: "Есть ли самовывоз?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Самовывоз возможен по договоренности. Детали подтвердим в переписке.",
          },
        },
      ],
    };
    setJsonLd("jsonld-faq-delivery", faqLd);
    return () => clearJsonLd("jsonld-faq-delivery");
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

        <div className="mt-6 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
          <div className="text-lg font-semibold">Вопросы по доставке</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm font-semibold">Сколько занимает доставка?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Срок зависит от города и выбранного способа доставки. Точные сроки уточняем после оформления заказа.
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Сколько стоит доставка?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Стоимость рассчитывается индивидуально и зависит от адреса и объема заказа.
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Есть ли самовывоз?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Самовывоз возможен по договоренности. Детали подтвердим в переписке.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
