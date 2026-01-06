import React from "react";
import { THEME } from "../data/theme";

export default function EmptyResults({ onRelax, onClearAll }) {
  return (
    <div className="mt-5 rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
      <div className="text-lg font-semibold" style={{ color: THEME.text }}>
        Ничего не найдено
      </div>
      <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
        Ослабьте фильтры: уберите “Не подходит”, выберите меньше “Хочу слышать” или снимите сезон.
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: THEME.accent, color: "#0B0B0F" }}
          onClick={onRelax}
        >
          Ослабить фильтры
        </button>
        <button
          type="button"
          className="rounded-full border px-5 py-2.5 text-sm transition hover:bg-white/[0.06]"
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={onClearAll}
        >
          Сбросить всё
        </button>
      </div>
    </div>
  );
}
