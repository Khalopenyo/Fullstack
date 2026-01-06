import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { THEME } from "../data/theme";
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

function VolumeSelect({ value, onChange, size }) {
  const isCompact = size === "compact";

  const VOLUME_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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

export default function PerfumeCard({
  perfume,
  score,
  liked,
  onLike,

  // НОВОЕ:
  onDetails,
  onAddToCart,

  // ОСТАВИЛ ДЛЯ СОВМЕСТИМОСТИ (если где-то ещё передаёшь onOpen):
  onOpen,

  volume,
  onVolumeChange,
}) {
  // чтобы не сломалось, если где-то ещё остался onOpen
  const handleDetails = onDetails || onOpen;
  const handleAddToCart = onAddToCart || onOpen;

  const scoreLabel =
    score >= 10 ? "Точное попадание" : score >= 6 ? "Хорошо подходит" : score >= 3 ? "Похоже" : "Слабое совпадение";

  const computedPrice = priceForVolume(perfume.price, volume, perfume.baseVolume);

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

            <div className="mt-2">
              <VolumeSelect value={volume} onChange={onVolumeChange} size="compact" />
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
        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-xs" style={{ color: THEME.muted }}>Сезон</div>
          <div className="mt-1 text-sm" style={{ color: THEME.text }}>{perfume.seasons.join(" · ")}</div>
        </div>

        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-xs" style={{ color: THEME.muted }}>Время</div>
          <div className="mt-1 text-sm" style={{ color: THEME.text }}>{perfume.dayNight.join(" · ")}</div>
        </div>

        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs" style={{ color: THEME.muted }}>Цена</div>
            <div className="text-xs" style={{ color: THEME.muted2 }}>{volume} мл</div>
          </div>
          <div className="mt-1 text-sm font-semibold" style={{ color: THEME.text }}>
            {computedPrice}{perfume.currency || "₽"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="perfumeCard__desc text-sm" style={{ color: THEME.muted }}>{perfume.description}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-xs" style={{ color: THEME.muted }}>Стойкость</div>
          <div className="mt-1"><Dots value={perfume.longevity} /></div>
        </div>
        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-xs" style={{ color: THEME.muted }}>Шлейф</div>
          <div className="mt-1"><Dots value={perfume.sillage} /></div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs" style={{ color: THEME.muted }}>
          Совпадение: <span style={{ color: THEME.text }}>{scoreLabel}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
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
