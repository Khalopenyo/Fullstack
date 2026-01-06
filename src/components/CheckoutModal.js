import React, { useMemo, useState } from "react";
import { X, Copy, MessageCircle, Send, Instagram } from "lucide-react";
import { THEME } from "../data/theme";
import { SELLER_CONTACTS } from "../data/sellerContacts";

function formatLine(item) {
  const p = item.perfume || {};
  const brand = p.brand || "";
  const name = p.name || "";
  const volume = item.volume != null ? String(item.volume) : "";
  const qty = item.qty != null ? String(item.qty) : "1";
  const unit = item.unit != null ? String(item.unit) : "";
  const cur = p.currency || "₽";
  return `- ${brand} ${name} · ${volume} мл ×${qty} — ${unit}${cur} / шт`;
}

function buildMessage(items, total) {
  const currency = (items[0]?.perfume?.currency) || "₽";
  const lines = items.map(formatLine).join("\n");
  return [
    "Здравствуйте! Хочу оформить заказ:",
    lines,
    "",
    `Итого: ${total}${currency}`,
    "",
    "Напишите, пожалуйста, по наличию и доставке.",
  ].join("\n");
}

export default function CheckoutModal({ open, items, total, onClose }) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => buildMessage(items || [], total || 0), [items, total]);
  const encoded = useMemo(() => encodeURIComponent(message), [message]);

  if (!open) return null;

  const openWithCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // если clipboard недоступен — просто продолжаем
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const wa = SELLER_CONTACTS.whatsappPhone ? `https://wa.me/${SELLER_CONTACTS.whatsappPhone}?text=${encoded}` : null;
  const tg = SELLER_CONTACTS.telegramUsername ? `https://t.me/${SELLER_CONTACTS.telegramUsername}` : null;
  const ig = SELLER_CONTACTS.instagramUsername ? `https://instagram.com/${SELLER_CONTACTS.instagramUsername}` : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl border p-5 max-h-[88vh] overflow-y-auto sm:max-h-none sm:overflow-visible"
        style={{ borderColor: THEME.border2, background: THEME.surface2, color: THEME.text }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Оформление заказа</div>
            <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
              Выбери мессенджер — я открою твой чат с продавцом, а текст заказа заранее скопирую в буфер обмена.
            </div>
          </div>

          <button
            type="button"
            className="rounded-full border p-2 hover:bg-white/[0.06]"
            style={{ borderColor: THEME.border2 }}
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border p-4"
             style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Текст заказа</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm hover:bg-white/[0.06]"
              style={{ borderColor: THEME.border2 }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
            >
              <Copy size={16} />
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </div>

          <pre
            className="mt-3 whitespace-pre-wrap text-sm"
            style={{
              color: THEME.text,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              lineHeight: 1.35,
            }}
          >
            {message}
          </pre>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:bg-white/[0.06] disabled:opacity-40"
            style={{ borderColor: THEME.border2 }}
            disabled={!wa}
            onClick={() => openWithCopy(wa)}
          >
            <div className="flex items-center gap-3">
              <MessageCircle size={20} />
              <div>
                <div className="text-sm font-semibold">WhatsApp</div>
                <div className="text-xs" style={{ color: THEME.muted }}>
                  сообщение подставится автоматически
                </div>
              </div>
            </div>
            <span className="text-sm opacity-80">→</span>
          </button>

          <button
            type="button"
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:bg-white/[0.06] disabled:opacity-40"
            style={{ borderColor: THEME.border2 }}
            disabled={!tg}
            onClick={() => openWithCopy(tg)}
          >
            <div className="flex items-center gap-3">
              <Send size={20} />
              <div>
                <div className="text-sm font-semibold">Telegram</div>
                <div className="text-xs" style={{ color: THEME.muted }}>
                  чат откроется, текст уже в буфере — просто вставь
                </div>
              </div>
            </div>
            <span className="text-sm opacity-80">→</span>
          </button>

          <button
            type="button"
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:bg-white/[0.06] disabled:opacity-40"
            style={{ borderColor: THEME.border2 }}
            disabled={!ig}
            onClick={() => openWithCopy(ig)}
          >
            <div className="flex items-center gap-3">
              <Instagram size={20} />
              <div>
                <div className="text-sm font-semibold">Instagram</div>
                <div className="text-xs" style={{ color: THEME.muted }}>
                  профиль откроется, текст уже в буфере — вставь в Direct
                </div>
              </div>
            </div>
            <span className="text-sm opacity-80">→</span>
          </button>
        </div>

        <div className="mt-4 text-xs" style={{ color: THEME.muted }}>
          Контакты продавца редактируются в <span className="font-semibold">src/data/sellerContacts.js</span>
        </div>
      </div>
    </div>
  );
}
