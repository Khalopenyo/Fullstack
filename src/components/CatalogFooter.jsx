import React from "react";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";

export default function CatalogFooter({ onOpenHelp, onOpenFaq }) {
  return (
    <div className="p-5 border-t" style={{ borderColor: THEME.border2 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs " style={{ color: THEME.muted2 }}>
          © {new Date().getFullYear()}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/about"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            О нас
          </Link>
          <Link
            to="/contacts"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            Контакты
          </Link>
          <Link
            to="/delivery"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            Доставка
          </Link>
          <Link
            to="/payment"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
          >
            Оплата
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={onOpenFaq}
          >
            FAQ
          </button>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/[0.06] "
          style={{ borderColor: THEME.border2, color: THEME.text }}
          onClick={onOpenHelp}
        >
          <Info className="h-4 w-4 " style={{ color: THEME.muted }} />
          Логика подбора
        </button>
      </div>
    </div>
  );
}
