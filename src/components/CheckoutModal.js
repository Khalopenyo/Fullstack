import React, { useMemo, useRef, useState } from "react";
import { X, Copy, MessageCircle, Send, Instagram } from "lucide-react";
import { THEME } from "../data/theme";
import { SELLER_CONTACTS } from "../data/sellerContacts";
import { useAuth } from "../state/auth";
import { createOrder } from "../services/ordersRepo";

function formatLine(item) {
  const p = item.perfume || {};
  const brand = p.brand || "";
  const name = p.name || "";
  const volume = item.volume != null ? String(item.volume) : "";
  const mix = item.mix || "60/40";
  const qty = item.qty != null ? String(item.qty) : "1";
  const unit = item.unit != null ? String(item.unit) : "";
  const cur = p.currency || "₽";
  return `- ${brand} ${name} · ${volume} мл · ${mix} ×${qty} — ${unit}${cur} / шт`;
}

function buildMessage(items, total, delivery, contact) {
  const currency = (items[0]?.perfume?.currency) || "₽";
  const lines = items.map(formatLine).join("\n");
  const method = delivery?.method === "delivery" ? "Доставка" : "Самовывоз";
  const address = delivery?.method === "delivery" ? String(delivery?.address || "").trim() : "";
  const name = String(contact?.name || "").trim();
  const phone = String(contact?.phone || "").trim();
  const email = String(contact?.email || "").trim();
  return [
    "Здравствуйте! Хочу оформить заказ:",
    lines,
    "",
    name ? `Имя: ${name}` : null,
    phone ? `Телефон: ${phone}` : null,
    email ? `Email: ${email}` : null,
    name || phone || email ? "" : null,
    `Способ: ${method}`,
    address ? `Адрес: ${address}` : null,
    "",
    `Итого: ${total}${currency}`,
    "",
    "Напишите, пожалуйста, по наличию и доставке.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function formatPhone(value) {
  const raw = normalizePhone(value);
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return "";

  let digits = digitsOnly;
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }

  if (digits.length >= 11 && digits.startsWith("7")) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}${digits.length > 11 ? " " + digits.slice(11) : ""}`;
  }

  if (raw.startsWith("+")) {
    return "+" + digits;
  }

  return digits;
}

function mapCursorToFormatted(rawValue, formattedValue, cursorPos) {
  const raw = String(rawValue || "");
  const formatted = String(formattedValue || "");
  const before = raw.slice(0, Math.max(0, cursorPos || 0));
  let digitsBefore = 0;
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] >= "0" && before[i] <= "9") digitsBefore += 1;
  }

  let idx = 0;
  let seen = 0;
  while (idx < formatted.length) {
    const ch = formatted[idx];
    if (ch >= "0" && ch <= "9") {
      seen += 1;
      if (seen >= digitsBefore) {
        return idx + 1;
      }
    }
    idx += 1;
  }
  return formatted.length;
}

function isValidPhone(value) {
  const raw = normalizePhone(value);
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export default function CheckoutModal({ open, items, total, onClose }) {
  const [copied, setCopied] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneCursor, setPhoneCursor] = useState(null);
  const phoneRef = useRef(null);
  const { user } = useAuth();

  const delivery = { method: deliveryMethod, address };
  const contact = { name: contactName, phone: contactPhone, email: contactEmail };
  const guestNeedsPhone = Boolean(user?.isAnonymous);
  const phoneRequiredMissing = guestNeedsPhone && !String(contactPhone || "").trim();
  const phoneInvalid = guestNeedsPhone && String(contactPhone || "").trim() && !isValidPhone(contactPhone);
  const message = useMemo(
    () => buildMessage(items || [], total || 0, delivery, contact),
    [items, total, deliveryMethod, address, contactName, contactPhone, contactEmail]
  );
  const encoded = useMemo(() => encodeURIComponent(message), [message]);

  React.useEffect(() => {
    if (phoneCursor == null) return;
    const id = requestAnimationFrame(() => {
      if (phoneRef.current && typeof phoneCursor === "number") {
        phoneRef.current.setSelectionRange(phoneCursor, phoneCursor);
        setPhoneCursor(null);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [phoneCursor]);

  if (!open) return null;

  const openWithCopy = async (url, channel) => {
    if (phoneRequiredMissing || phoneInvalid) return;
    try {
      await createOrder({
        user,
        items,
        total,
        channel,
        contact,
        delivery: { method: deliveryMethod, address },
      });
    } catch {
      // не ломаем UX, если запись заказа не удалась
    }
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
        className="w-full max-w-lg rounded-3xl border p-5"
        style={{
          borderColor: THEME.border2,
          background: "#0B0B0F",
          color: THEME.text,
          maxHeight: "88vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Оформление заказа</div>
            <div className="mt-1 text-sm" style={{ color: THEME.muted }}>
              {user?.isAnonymous
                ? "Гостевой заказ сохраняется без привязки к аккаунту."
                : "Заказ будет сохранен в истории аккаунта."}
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
            className="mt-3 w-full max-w-full whitespace-pre-wrap break-words text-sm"
            style={{
              color: THEME.text,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              lineHeight: 1.35,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {message}
          </pre>
        </div>

        {user?.isAnonymous ? (
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
            <div className="text-sm font-semibold">Контактные данные</div>
            <div className="mt-3 grid gap-3">
              <label className="text-xs" style={{ color: THEME.muted }}>
                Имя
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  placeholder="Как к вам обращаться?"
                />
              </label>
              <label className="text-xs" style={{ color: THEME.muted }}>
                Телефон
                <input
                  ref={phoneRef}
                  value={contactPhone}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const formatted = formatPhone(raw);
                    const nextCursor = mapCursorToFormatted(raw, formatted, e.target.selectionStart);
                    setContactPhone(formatted);
                    setPhoneCursor(nextCursor);
                  }}
                  className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  placeholder="+7 ..."
                />
              </label>
              <label className="text-xs" style={{ color: THEME.muted }}>
                Email
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            {phoneRequiredMissing ? (
              <div className="mt-2 text-xs" style={{ color: "rgba(255,120,120,0.85)" }}>
                Укажи номер телефона, чтобы оформить заказ.
              </div>
            ) : phoneInvalid ? (
              <div className="mt-2 text-xs" style={{ color: "rgba(255,120,120,0.85)" }}>
                Неверный формат номера (10–15 цифр).
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-sm font-semibold">Получение</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs" style={{ color: THEME.muted }}>
              Способ
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                style={{ borderColor: THEME.border2, color: THEME.text }}
              >
                <option value="pickup">Самовывоз</option>
                <option value="delivery">Доставка</option>
              </select>
            </label>
            <label className="text-xs" style={{ color: THEME.muted }}>
              Адрес доставки
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={deliveryMethod !== "delivery"}
                placeholder="Город, улица, дом, квартира"
                className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                style={{ borderColor: THEME.border2, color: THEME.text }}
              />
            </label>
          </div>
          {deliveryMethod === "delivery" && !address.trim() ? (
            <div className="mt-2 text-xs" style={{ color: THEME.muted2 }}>
              Укажи адрес — он попадёт в текст заказа.
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:bg-white/[0.06] disabled:opacity-40"
            style={{ borderColor: THEME.border2 }}
            disabled={!wa || phoneRequiredMissing || phoneInvalid}
            onClick={() => openWithCopy(wa, "wa")}
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
            disabled={!tg || phoneRequiredMissing || phoneInvalid}
            onClick={() => openWithCopy(tg, "tg")}
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
            disabled={!ig || phoneRequiredMissing || phoneInvalid}
            onClick={() => openWithCopy(ig, "ig")}
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
          {/* Контакты продавца редактируются в <span className="font-semibold">src/data/sellerContacts.js</span> */}
        </div>
      </div>
    </div>
  );
}
