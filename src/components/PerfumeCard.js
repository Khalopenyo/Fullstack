import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Flame, Heart, Star } from "lucide-react";
import { plural } from "../lib/utils";
import { THEME } from "../data/theme";
import { MIX_OPTIONS, VOLUME_OPTIONS } from "../data/perfumes";
import SafeImage from "./SafeImage";
import { priceForVolume } from "../lib/scoring";
import { clamp } from "../lib/utils";

function Dots({ value }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i + 1 <= value;
        return (
          <span
            key={i}
            className={"h-1.5 w-4 rounded-full " + (on ? "bg-white/85" : "bg-white/15")}
          />
        );
      })}
    </div>
  );
}

function RatingStars({ value, size = 14 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i + 1 <= v;
        return (
          <Star
            key={i}
            className={on ? "fill-current" : ""}
            style={{ color: on ? THEME.accent : THEME.muted2, width: size, height: size }}
          />
        );
      })}
    </div>
  );
}

function VolumeSelect({ value, onChange, size }) {
  const isCompact = size === "compact";

  return (
    <div className={"flex items-center gap-2 " + (isCompact ? "" : "flex-wrap")}>
      <div className="text-xs" style={{ color: THEME.muted }}>
        Объём
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
        style={{ borderColor: THEME.border2,
    color: THEME.text,
    background: "#0C0C10",
    colorScheme: "dark",}}
        aria-label="Выбор объёма"
      >
        {VOLUME_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v} мл
          </option>
        ))}
      </select>
    </div>
  );
}

function MixSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs" style={{ color: THEME.muted }}>
        Пропорции
      </div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
        style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
        aria-label="Выбор пропорций"
      >
        {MIX_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PerfumeCard({
  perfume,
  score,
  liked,
  onLike,
  reviewSummary,

  // НОВОЕ:
  onDetails,
  onAddToCart,

  // ОСТАВИЛ ДЛЯ СОВМЕСТИМОСТИ (если где-то ещё передаёшь onOpen):
  onOpen,

  volume,
  mix,
  onVolumeChange,
  onMixChange,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // чтобы не сломалось, если где-то ещё остался onOpen
  const handleDetails = onDetails || onOpen;
  const handleAddToCart = onAddToCart || onOpen;

  const scoreLabel =
    score >= 10 ? "Точное попадание" : score >= 6 ? "Хорошо подходит" : score >= 3 ? "Похоже" : "Слабое совпадение";

  const computedPrice = priceForVolume(perfume.price, volume, perfume.baseVolume, mix);
  const summaryCount = Number(reviewSummary?.count ?? 0);
  const summaryAvg = Number(reviewSummary?.avg ?? 0);
  const reviewCount = summaryCount || Number(perfume.ratingCount ?? perfume.reviewCount ?? 0);
  const reviewAvg = summaryCount ? summaryAvg : Number(perfume.ratingAvg ?? perfume.reviewAvg ?? 0);
  const inStock = perfume.inStock !== false;
  const isHit = Boolean(perfume.isHit);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
        className="perfumeCard rounded-3xl border p-4"
      style={{ borderColor: THEME.border2, background: THEME.surface2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="shrink-0 overflow-hidden rounded-3xl border"
            style={{
              borderColor: THEME.border2,
              background: "rgba(255,255,255,0.02)",
              width: 96,
              height: 96,
              flexShrink: 0,
            }}
          >
            <SafeImage
              src={perfume.image}
              alt={perfume.brand + " " + perfume.name}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-xs" style={{ color: THEME.muted }}>
              {perfume.brand}
            </div>
            <div className="mt-1 truncate text-lg font-semibold" style={{ color: THEME.text }}>
              {perfume.name}
            </div>
            <div className="mt-1 truncate text-sm" style={{ color: THEME.muted }}>
              {perfume.family}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                style={{
                  borderColor: inStock ? "rgba(120,220,160,0.35)" : "rgba(255,120,120,0.35)",
                  background: inStock ? "rgba(120,220,160,0.12)" : "rgba(255,120,120,0.08)",
                  color: THEME.text,
                }}
              >
                {inStock ? "В наличии" : "Нет в наличии"}
              </div>
              {isHit ? (
                <div
                  className="inline-flex items-center rounded-full border px-2 py-0.5"
                  style={{ borderColor: "rgba(255,205,120,0.45)", background: "rgba(255,205,120,0.14)" }}
                >
                  <Flame className="h-3 w-3" style={{ color: "#F4B462" }} />
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: THEME.muted }}>
              {reviewCount > 0 ? (
                <>
                  <RatingStars value={reviewAvg} size={14} />
                  <span style={{ color: THEME.text }}>{reviewAvg.toFixed(1)}</span>
                  <span>
                    ({reviewCount} {plural(reviewCount, "отзыв", "отзыва", "отзывов")})
                  </span>
                </>
              ) : (
                <span>Нет отзывов</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <VolumeSelect value={volume} onChange={onVolumeChange} size="compact" />
              <MixSelect value={mix} onChange={onMixChange} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLike}
          className="rounded-full border p-2 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
          style={{ borderColor: liked ? "rgba(247,242,232,0.20)" : THEME.border2 }}
          aria-label={liked ? "Убрать из избранного" : "В избранное"}
        >
          <Heart
            className={"h-5 w-5 " + (liked ? "fill-current" : "")}
            style={{ color: liked ? THEME.accent : THEME.muted }}
          />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {/* <button
          type="button"
          className="flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition hover:bg-white/[0.04]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          aria-label="Показать сезон и время"
        >
          <span style={{ color: THEME.muted }}>Сезон и время</span>
          <ChevronDown
            className={"h-4 w-4 transition " + (detailsOpen ? "rotate-180" : "")}
            style={{ color: THEME.muted }}
          />
        </button> */}

        <div
          className="rounded-2xl border px-3 py-2"
          style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs" style={{ color: THEME.muted }}>Цена</div>
            <div className="text-xs" style={{ color: THEME.muted2 }}>{volume} мл</div>
          </div>
          <div className="mt-1 text-2xl font-semibold" style={{ color: THEME.text }}>
            {computedPrice}{perfume.currency || "₽"}
          </div>
        </div>
      </div>

      {/* {detailsOpen ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div
            className="rounded-2xl border px-3 py-2"
            style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-xs" style={{ color: THEME.muted }}>Сезон</div>
            <div className="mt-1 text-sm" style={{ color: THEME.text }}>{perfume.seasons.join(" · ")}</div>
          </div>

          <div
            className="rounded-2xl border px-3 py-2"
            style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-xs" style={{ color: THEME.muted }}>Время</div>
            <div className="mt-1 text-sm" style={{ color: THEME.text }}>{perfume.dayNight.join(" · ")}</div>
          </div>
        </div>
      ) : null} */}

      {/* <div className="mt-4">
        <div className="perfumeCard__desc text-sm" style={{ color: THEME.muted }}>{perfume.description}</div>
      </div> */}

      {/* <div className="mt-4 hidden sm:flex gap-2">
        <div className="rounded-2xl border px-2 py-1.5 flex-1 flex items-center justify-center flex-col" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-[10px]" style={{ color: THEME.muted }}>Стойкость</div>
          <div className="mt-1"><Dots value={perfume.longevity} /></div>
        </div>
        <div className="rounded-2xl border px-2 py-1.5 flex-1 flex items-center justify-center flex-col" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-[10px]" style={{ color: THEME.muted }}>Шлейф</div>
          <div className="mt-1"><Dots value={perfume.sillage} /></div>
        </div>
      </div>  */}

      <div className="mt-4">
        <div className="text-xs" style={{ color: THEME.muted }}>
          Совпадение: <span style={{ color: THEME.text }}>{scoreLabel}</span>
        </div>
        <div className="mt-2 h-2 w-1/2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: String(clamp(Math.round((score / 12) * 100), 0, 100)) + "%",
              background: THEME.accent,
            }}
          />
        </div>
      </div>

      {/* ВОТ ТУТ ГЛАВНОЕ ИЗМЕНЕНИЕ: две разные кнопки */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold"
          style={{ background: THEME.accent, color: "#0B0B0F" }}
          onClick={handleDetails}
        >
          Подробнее
        </button>

        <button
          type="button"
          className="rounded-full border px-4 py-2.5 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={handleAddToCart}
        >
          В корзину
        </button>
      </div>
    </motion.div>
  );
}
