import React from "react";
import { Heart, ShoppingBag, Info, SlidersHorizontal, User } from "lucide-react";
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
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: THEME.border2, background: "rgba(12,12,16,0.72)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-2xl border"
            style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: THEME.accent }} />
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

        <div className="flex items-center gap-2">
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
            <span className="catalogHeader__text">{authLabel || "Аккаунт"}</span>
          </PillButton>

          <PillButton onClick={onGoFavorites}>
            <Heart className="h-4 w-4" style={{ color: favoritesCount ? THEME.accent : THEME.muted }} />
            {favoritesCount || 0}
          </PillButton>

          <PillButton onClick={onGoCart}>
            <ShoppingBag className="h-4 w-4" style={{ color: cartCount ? THEME.accent : THEME.muted }} />
            {cartCount || 0}
          </PillButton>
        </div>
      </div>
    </header>
  );
}
