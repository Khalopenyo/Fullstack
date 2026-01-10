import React from "react";
import { Heart, ShoppingBag, Info, SlidersHorizontal, User, Search, X } from "lucide-react";
import { THEME } from "../data/theme";

function PillButton({ onClick, children }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
      style={{ borderColor: THEME.border2, color: THEME.text }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function CatalogHeader({
  favoritesCount,
  cartCount,
  onGoFavorites,
  onGoCart,
  onOpenHelp,
  onOpenFilters,
  onOpenAuth,
  authLabel,
  q,
  onChangeQ,
  onClearQ,
}) {

  const [searchActive , setSearchActive] = React.useState(false)

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: THEME.border2, background: "rgba(12,12,16,0.72)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        {/* Верхняя строка */}
        <div className="flex items-center justify-between gap-3">
          {/* ЛОГОТИП — НЕ ТРОГАЕМ */}
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-2xl border"
              style={{
                borderColor: THEME.border2,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: THEME.accent }}
              />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ letterSpacing: 0.2 }}>
                Bakhur
              </div>
              <div className="text-xs" style={{ color: THEME.muted }}>
                Сертифицированные маслянные ароматы
              </div>
            </div>
          </div>
        </div>

        {/* КНОПКИ */}
        <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:flex-nowrap md:justify-end">
          <PillButton onClick={onOpenHelp}>
            <Info className="h-4 w-4" style={{ color: THEME.muted }} />
            <span className="catalogHeader__text">Логика</span>
          </PillButton>

          <button
            type="button"
            className="catalogHeader__filtersBtn inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06] md:hidden"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="h-4 w-4" style={{ color: THEME.muted }} />
            <span className="catalogHeader__text">Фильтры</span>
          </button>

          <PillButton onClick={onOpenAuth}>
            <User className="h-4 w-4" style={{ color: THEME.muted }} />
            <span className="catalogHeader__text">
              {authLabel || "Аккаунт"}
            </span>
          </PillButton>

          <PillButton onClick={onGoFavorites}>
            <Heart
              className="h-4 w-4"
              style={{ color: favoritesCount ? THEME.accent : THEME.muted }}
            />
            {favoritesCount || 0}
          </PillButton>

          <PillButton onClick={onGoCart}>
            <ShoppingBag
              className="h-4 w-4"
              style={{ color: cartCount ? THEME.accent : THEME.muted }}
            />
            {cartCount || 0}
          </PillButton>

          <PillButton>
            <Search
            className="h-5 w-5"
            style={{ color: THEME.muted }}
            onClick={()=>setSearchActive(!searchActive)}
            />
          </PillButton>
        </div>

          {/* Илисхан 01 */}
        {searchActive && <div className="mt-3">
          <div className="catalogHeader__search relative">
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
        </div>} 
      </div>
    </header>
  );
}
