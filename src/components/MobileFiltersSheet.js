import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { THEME } from "../data/theme";

export default function MobileFiltersSheet({ open, total, children, onClose, onClear }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[86vh] overflow-auto rounded-t-3xl border p-4"
            style={{ background: THEME.surface, borderColor: THEME.border }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: THEME.text }}>Фильтры</div>
                <div className="text-xs" style={{ color: THEME.muted }}>Подбор по нотам и сезону</div>
              </div>
              <button
                type="button"
                className="rounded-full border p-2 hover:bg-white/10"
                style={{ borderColor: THEME.border2 }}
                onClick={onClose}
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" style={{ color: THEME.muted }} />
              </button>
            </div>

            <div className="mt-4 space-y-4">{children}</div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border px-4 py-3 text-sm transition hover:bg-white/[0.06]"
                style={{ borderColor: THEME.border2, color: THEME.text }}
                onClick={onClear}
              >
                Сбросить
              </button>
              <button
                type="button"
                className="flex-1 rounded-full px-4 py-3 text-sm font-semibold"
                style={{ background: THEME.accent, color: "#0B0B0F" }}
                onClick={onClose}
              >
                Показать ({total})
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
