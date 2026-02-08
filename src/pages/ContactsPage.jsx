import React from "react";
import { Link } from "react-router-dom";
import { THEME } from "../data/theme";
import { SELLER_CONTACTS } from "../data/sellerContacts";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";

const CONTACT_ADDRESS = "Грозный,улица.Назарбаева 66";
const WORK_HOURS = "Ежедневно 9:00–20:00";
const PHONE = "+7 (928) 071-71-71";
const EMAIL = "bakhurparfum@mail.ru";

export default function ContactsPage() {
  React.useEffect(() => {
    setMeta({
      title: "Memory — контакты",
      description: "Контакты, адрес, часы работы и мессенджеры Memory.",
    });
    setCanonical(window.location.origin + "/contacts");
    setOpenGraphImage(window.location.origin + "/logo192.png");
  }, []);

  const wa = SELLER_CONTACTS.whatsappPhone ? `https://wa.me/${SELLER_CONTACTS.whatsappPhone}` : null;
  const tg = SELLER_CONTACTS.telegramUsername ? `https://t.me/${SELLER_CONTACTS.telegramUsername}` : null;
  const ig = SELLER_CONTACTS.instagramUsername ? `https://instagram.com/${SELLER_CONTACTS.instagramUsername}` : null;

  const mapQuery = encodeURIComponent(CONTACT_ADDRESS);
  const mapUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm underline" style={{ color: THEME.muted2 }}>
            ← В каталог
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border p-6" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
            <h1 className="text-lg font-semibold">Контакты</h1>
            <div className="mt-3 space-y-3 text-sm" style={{ color: THEME.muted }}>
              <div>
                <div className="text-xs" style={{ color: THEME.muted2 }}>Адрес</div>
                <div style={{ color: THEME.text }}>{CONTACT_ADDRESS}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: THEME.muted2 }}>Часы работы</div>
                <div style={{ color: THEME.text }}>{WORK_HOURS}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: THEME.muted2 }}>Телефон</div>
                <div style={{ color: THEME.text }}>{PHONE}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: THEME.muted2 }}>Email</div>
                <div style={{ color: THEME.text }}>{EMAIL}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                >
                  WhatsApp
                </a>
              ) : null}
              {tg ? (
                <a
                  href={tg}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                >
                  Telegram
                </a>
              ) : null}
              {ig ? (
                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                >
                  Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
            <iframe
              title="Карта"
              src={mapUrl}
              className="h-full min-h-[320px] w-full"
              loading="lazy"
              style={{ border: 0 }}
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
}
