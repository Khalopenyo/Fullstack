import React from "react";
import { Search, SlidersHorizontal, X, Heart } from "lucide-react";
import { THEME } from "../data/theme";
import { plural } from "../lib/utils";

// Toolbar that MUST keep desktop layout intact.
// Mobile/tablet tweaks are done via responsive.css (max-width media queries)
// so we don't break the existing desktop design.

export default function CatalogToolbar({
  q,
  onChangeQ,
  onClearQ,
  sort,
  onChangeSort,
  total,
  favoritesCount,
  onClearAll,
  onOpenFilters,
}) {
  return (
    <div
      className="catalogToolbar rounded-3xl border p-4"
      style={{ borderColor: THEME.border2, background: THEME.surface2 }}
    >
      {/* Row 1: search + sort + reset (desktop like in the original design) */}
      <div className="catalogToolbar__row flex items-center gap-3">
        <div className="catalogToolbar__search relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: THEME.muted2 }}
          />
          <input
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            className="w-full rounded-2xl border bg-transparent px-11 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            placeholder="Поиск по бренду, названию, нотам..."
          />
          {q ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-white/10"
              onClick={onClearQ}
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" style={{ color: THEME.muted }} />
            </button>
          ) : null}
        </div>

        <div className="catalogToolbar__controls flex items-center gap-2">
          <label className="text-xs" style={{ color: THEME.muted }}>
            Сортировка
          </label>
          <select
            value={sort}
            onChange={(e) => onChangeSort(e.target.value)}
            className="rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
            style={{
              borderColor: THEME.border2,
              color: THEME.text,
              background: "#0C0C10",
              colorScheme: "dark",
            }}
          >
            <option value="popular">Популярные</option>
            <option value="popular_month">Популярные (месяц)</option>
            <option value="match">По совпадению</option>
            <option value="price_asc">Цена: ↑</option>
            <option value="price_desc">Цена: ↓</option>
            <option value="longevity">Стойкость</option>
            <option value="sillage">Шлейф</option>
          </select>

          <button
            type="button"
            className="rounded-full border px-4 py-3 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={onClearAll}
          >
            Сбросить
          </button>

          {/* Only on mobile: open filters sheet */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm transition hover:bg-white/[0.06] md:hidden"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="h-4 w-4" style={{ color: THEME.muted }} />
            Фильтры
          </button>
        </div>
      </div>

      {/* Row 2: counters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-3 py-1.5 text-sm"
          style={{ borderColor: THEME.border2, color: THEME.text }}
        >
          {total} {plural(total, "вариант", "варианта", "вариантов")}
        </span>

        {favoritesCount ? (
          <span
            className="rounded-full border px-3 py-1.5 text-sm"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            <Heart className="mr-2 inline-block h-4 w-4" style={{ color: THEME.accent }} />
            {favoritesCount} {plural(favoritesCount, "избранный", "избранных", "избранных")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
