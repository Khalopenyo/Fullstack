import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart } from "lucide-react";

import { THEME } from "../data/theme";
import SafeImage from "./SafeImage";
import { VOLUME_OPTIONS } from "../data/perfumes";
import { priceForVolume } from "../lib/scoring";

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

  return (
    <div className={"flex items-center gap-2 " + (isCompact ? "" : "flex-wrap")}>
      <div className="text-xs" style={{ color: THEME.muted }}>
        Объём
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={
          "rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
        }
        style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
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

export default function PerfumeDetailsModal({
  open,
  perfume,
  volume,
  liked,
  onVolumeChange,
  onClose,
  onAddToCart,
  onToggleFavorite,
}) {
  const title = perfume ? `${perfume.brand} — ${perfume.name}` : "";
  const price = perfume ? priceForVolume(perfume.price, volume, perfume.baseVolume) : 0;

  return (
    <AnimatePresence>
      {open && perfume ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div
              className="perfumeDetailsModal__panel w-full max-w-2xl rounded-3xl border shadow-2xl overflow-x-hidden"
              style={{ background: THEME.surface, borderColor: THEME.border }}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b p-5"
                style={{ borderColor: THEME.border2 }}
              >
                <div>
                  <div className="text-base font-semibold" style={{ color: THEME.text }}>
                    {title}
                  </div>
                  <div className="text-xs" style={{ color: THEME.muted }}>
                    Подробности аромата
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" style={{ color: THEME.muted }} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-5 p-5" style={{ color: THEME.text }}>
                <div
                  className="rounded-3xl border p-4"
                  style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                >
                  <div className="perfumeDetailsModal__summary flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 overflow-hidden rounded-3xl border"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                          width: 128,
                          height: 128,
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

                      <div>
                        <div className="text-sm" style={{ color: THEME.muted }}>
                          {perfume.family}
                        </div>
                        <div className="mt-1 text-2xl font-semibold" style={{ color: THEME.text }}>
                          {perfume.name}
                        </div>
                        <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
                          {perfume.description}
                        </div>

                        <div className="mt-4">
                          <VolumeSelect value={volume} onChange={onVolumeChange} size="regular" />
                        </div>
                      </div>
                    </div>

                    <div className="perfumeDetailsModal__price text-right">
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Цена
                      </div>
                      <div className="perfumeDetailsModal__priceValue mt-1 text-2xl font-semibold" style={{ color: THEME.text }}>
                        {price} {perfume.currency}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: THEME.muted2 }}>
                        за {volume} мл
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {perfume.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border px-3 py-1 text-xs"
                        style={{
                          borderColor: THEME.border2,
                          color: THEME.text,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Сезоны
                      </div>
                      <div className="mt-1 text-sm" style={{ color: THEME.text }}>
                        {perfume.seasons.join(", ")}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Подходит
                      </div>
                      <div className="mt-1 text-sm" style={{ color: THEME.text }}>
                        {perfume.dayNight.join(", ")}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Профиль
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: THEME.text }}>
                          Стойкость
                        </span>
                        <Dots value={perfume.longevity} />
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: THEME.text }}>
                          Шлейф
                        </span>
                        <Dots value={perfume.sillage} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      Верх
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.top.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      Сердце
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.heart.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      База
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.base.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-full px-5 py-3 text-sm font-semibold"
                    style={{ background: THEME.accent, color: "#0B0B0F" }}
                    onClick={onAddToCart}
                  >
                    Добавить в корзину ({volume} мл)
                  </button>

                  <button
                    type="button"
                    className="flex-1 rounded-full border px-5 py-3 text-sm transition hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: liked ? "rgba(127,122,73,0.14)" : "transparent",
                    }}
                    onClick={onToggleFavorite}
                  >
                    <Heart className="mr-2 inline-block h-4 w-4" style={{ color: liked ? THEME.accent : THEME.muted }} />
                    {liked ? "В избранном" : "В избранное"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
