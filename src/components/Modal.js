import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { THEME } from "../data/theme";

/**
 * Универсальное модальное окно.
 *
 * Props:
 * - open: boolean
 * - title: string
 * - children: React.ReactNode
 * - onClose: () => void
 */
export default function Modal({ open, title, children, onClose }) {
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
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div
              className="w-full max-w-2xl rounded-3xl border shadow-2xl max-h-[88vh] overflow-x-hidden overflow-y-auto sm:max-h-none sm:overflow-hidden"
              style={{ background: THEME.surface, borderColor: THEME.border }}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <div
                className="flex items-center justify-between border-b p-5"
                style={{ borderColor: THEME.border2 }}
              >
                <div>
                  <div className="text-base font-semibold" style={{ color: THEME.text }}>
                    {title}
                  </div>
                  <div className="text-xs" style={{ color: THEME.muted }}>
                    Лаконично и по делу
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

              <div className="space-y-5 p-5" style={{ color: THEME.text }}>
                {children}
              </div>

              <div className="flex justify-end border-t p-5" style={{ borderColor: THEME.border2 }}>
                <button
                  type="button"
                  className="rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ background: THEME.accent, color: "#0B0B0F" }}
                  onClick={onClose}
                >
                  Ок
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
