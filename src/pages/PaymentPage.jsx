import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { clearJsonLd, setCanonical, setJsonLd, setMeta, setOpenGraphImage } from "../lib/seo";

export default function PaymentPage() {
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — оплата",
      description: "Способы оплаты и подтверждение заказа.",
    });
    setCanonical(window.location.origin + "/payment");
    setOpenGraphImage(window.location.origin + "/logo192.png");
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Какие способы оплаты доступны?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Способ оплаты согласуем в переписке после оформления заказа. Подберем удобный вариант.",
          },
        },
        {
          "@type": "Question",
          name: "Когда подтверждается заказ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Мы связываемся после оформления заказа, уточняем детали и подтверждаем оплату.",
          },
        },
        {
          "@type": "Question",
          name: "Можно ли оплатить оптовый заказ по счету?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Да, для опта можем подготовить счет. Сообщи менеджеру при оформлении.",
          },
        },
      ],
    };
    setJsonLd("jsonld-faq-payment", faqLd);
    return () => clearJsonLd("jsonld-faq-payment");
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

        <div className="mt-6 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
          <div className="text-lg font-semibold">Вопросы по оплате</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm font-semibold">Какие способы оплаты доступны?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Способ оплаты согласуем в переписке после оформления заказа. Подберем удобный вариант.
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Когда подтверждается заказ?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Мы связываемся после оформления заказа, уточняем детали и подтверждаем оплату.
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Можно ли оплатить оптовый заказ по счету?</div>
              <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
                Да, для опта можем подготовить счет. Сообщи менеджеру при оформлении.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
