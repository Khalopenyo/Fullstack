import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { THEME } from "../data/theme";

// Toolbar that MUST keep desktop layout intact.
// Mobile/tablet tweaks are done via responsive.css (max-width media queries)
// so we don't break the existing desktop design.

export default function CatalogToolbar({
  sort,
  onChangeSort,
  onClearAll,
  onOpenFilters,
}) {
  return (
    <>
        {/* Row 1: sort + reset (desktop like in the original design) */}
        <div className="catalogToolbar__row flex items-center gap-3">
          <div className="catalogToolbar__controls catalogToolbar__controls--desktop flex items-center gap-2">
            <label className="text-xs" style={{ color: THEME.muted }}>
              Сортировка
            </label>
            <select
              value={sort}
              onChange={(e) => onChangeSort(e.target.value)}
              className="min-w-[260px] max-w-full rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
              style={{
                borderColor: THEME.border2,
                color: THEME.text,
                background: "#0C0C10",
                colorScheme: "dark",
              }}
            >
              <option value="popular">Популярные</option>
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
          </div>
        </div>

      {/* Row 2: counters removed per request */}

      {/* Mobile: filters + sorting below the toolbar */}
      <div
        className="catalogToolbar__mobileControls rounded-2xl border p-2"
        style={{ borderColor: THEME.border2, background: THEME.surface2 }}
      >
        <select
          value={sort}
          onChange={(e) => onChangeSort(e.target.value)}
          className="min-w-[220px] max-w-full rounded-2xl border bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
          style={{
            borderColor: THEME.border2,
            color: THEME.text,
            background: "#0C0C10",
            colorScheme: "dark",
          }}
          aria-label="Сортировка"
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
          className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs transition hover:bg-white/[0.06]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="h-4 w-4" style={{ color: THEME.muted }} />
          Фильтры
        </button>

        <button
          type="button"
          className="rounded-full border px-3 py-2 text-xs transition hover:bg-white/[0.06]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={onClearAll}
        >
          Сбросить
        </button>
      </div>
    </>
  );
}
