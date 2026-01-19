import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";

export default function AboutPage() {
  React.useEffect(() => {
    setMeta({
      title: "Bakhur — о нас",
      description: "О бренде Bakhur, философии ароматов и качестве масляных композиций.",
    });
    setCanonical(window.location.origin + "/about");
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
          <div className="text-lg font-semibold">О нас</div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: THEME.muted }}>
            Bakhur — это каталог масляных ароматов с фокусом на качество, стойкость и чистую композицию.
            Мы отбираем ароматы по характеру, нотам и сезону, чтобы подбор был точным и удобным.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: THEME.muted }}>
            Мы работаем с оригинальными парфюмерными композициями, уделяем внимание концентрации масел
            и делаем упор на комфортное звучание в течение дня. В каталоге представлены как свежие,
            так и насыщенные ноты — от цитруса и зелени до смол, древесины и мускуса.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: THEME.muted }}>
            Заказы оформляются через мессенджеры, где мы подскажем по наличию, доставке и вариантам объема.
            Для партнеров доступен оптовый каталог и гибкие условия.
          </p>
        </div>
      </div>
    </div>
  );
}
