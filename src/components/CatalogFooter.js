import React from "react";
import { Info } from "lucide-react";
import { THEME } from "../data/theme";

export default function CatalogFooter({ onOpenHelp }) {
  return (
    <div className="p-5 border-t" style={{ borderColor: THEME.border2 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs " style={{ color: THEME.muted2 }}>
          © {new Date().getFullYear()} Aroma Atelier
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
