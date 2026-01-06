// src/data/perfumes.js

export const SEASONS = [
  { key: "Зима", hint: "Плотные, тёплые, амбровые" },
  { key: "Весна", hint: "Нежные, прозрачные, цветочные" },
  { key: "Лето", hint: "Свежие, лёгкие, цитрусовые" },
  { key: "Осень", hint: "Древесные, пряные, уютные" },
];

export const ALL_NOTES_GROUPS = [
  {
    label: "Цитрусы",
    notes: ["Бергамот", "Лимон", "Апельсин", "Грейпфрут", "Нероли", "Мандарин"],
  },
  {
    label: "Фрукты",
    notes: ["Яблоко", "Груша", "Персик", "Черная смородина", "Инжир", "Манго"],
  },
  {
    label: "Цветы",
    notes: ["Роза", "Жасмин", "Пион", "Ирис", "Тубероза", "Ландыш", "Флердоранж"],
  },
  {
    label: "Свежесть",
    notes: ["Зеленый чай", "Мята", "Лаванда", "Озон", "Морские ноты", "Гальбанум"],
  },
  {
    label: "Пряности",
    notes: ["Ваниль", "Корица", "Кардамон", "Перец", "Шафран", "Гвоздика"],
  },
  {
    label: "Древесные",
    notes: ["Кедр", "Сандал", "Ветивер", "Пачули", "Уд", "Дубовый мох"],
  },
  {
    label: "Смолы/Сладость",
    notes: ["Амбра", "Ладан", "Бензоин", "Карамель", "Тонка", "Мускус"],
  },
  {
    label: "Кожа/Табак",
    notes: ["Кожа", "Табак", "Ром", "Кофе", "Какао"],
  },
];

export const VOLUME_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// Inline "premium bottle" placeholders (no hosting needed)
export const makeBottleSvg = (title, subtitle) => {
  const t = String(title || "").slice(0, 22);
  const s = String(subtitle || "").slice(0, 28);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(12,12,16,0.95)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.06)"/>
    </linearGradient>
    <radialGradient id="r" cx="35%" cy="25%" r="70%">
      <stop offset="0" stop-color="rgba(165,160,95,0.55)"/>
      <stop offset="1" stop-color="rgba(127,122,73,0.05)"/>
    </radialGradient>
  </defs>

  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="240" cy="210" r="320" fill="url(#r)"/>

  <g opacity="0.95">
    <rect x="330" y="120" width="140" height="80" rx="28" fill="rgba(247,242,232,0.22)"/>
    <rect x="308" y="190" width="184" height="70" rx="26" fill="rgba(247,242,232,0.12)"/>
    <rect x="260" y="240" width="280" height="420" rx="54" fill="rgba(247,242,232,0.08)" stroke="rgba(247,242,232,0.18)" stroke-width="2"/>
    <rect x="300" y="300" width="200" height="160" rx="24" fill="rgba(12,12,16,0.55)" stroke="rgba(247,242,232,0.14)" stroke-width="2"/>
  </g>

  <text x="400" y="370" text-anchor="middle" font-family="ui-sans-serif, -apple-system, Segoe UI, Roboto" font-size="34" fill="rgba(247,242,232,0.92)" font-weight="700">${t}</text>
  <text x="400" y="415" text-anchor="middle" font-family="ui-sans-serif, -apple-system, Segoe UI, Roboto" font-size="20" fill="rgba(247,242,232,0.68)">${s}</text>
</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

export const PERFUMES = [
  {
    id: "p-01",
    image: "/creed.png",
    brand: "Bakhur",
    name: "Bakhur Creed",
    family: "",
    baseVolume: 50,
    price: 79,
    currency: "₽",
    seasons: ["Лето", "Весна"],
    dayNight: ["День"],
    longevity: 5,
    sillage: 5,
    notes: {
      top: ["Фруктовый", "Сладкий", "Древесный"],
      heart: ["Цитрусовый", "Тропический"],
      base: ["Мускус", "Кедр"],
    },
    tags: ["унисекс", "офис", "чистый"],
    description: "Искрящаяся свежесть с мягким мускусным шлейфом. Идеален для тёплых дней.",
  },
  {
    id: "p-lv-limmensite",
    image: "/limensite.png",
    brand: "Louis Vuitton",
    name: "L'Immensité",
    family: "Citrus Amber",
    baseVolume: 50,
    price: 149,
    currency: "₽",
    seasons: ["Весна", "Лето"],
    dayNight: ["День"],
    longevity: 4,
    sillage: 3,
    notes: {
      top: ["Грейпфрут", "Имбирь", "Бергамот"],
      heart: ["Водные ноты", "Розмарин", "Шалфей", "Герань"],
      base: ["Амброксан", "Амбра", "Лабданум"],
    },
    tags: ["свежий", "унисекс", "офис", "премиум"],
    description:
      "Цитрусовая свежесть с пряным имбирём и чистой амброво-мускусной базой. Универсальный аромат на каждый день.",
  },

  // ...остальные ароматы как у тебя
  {
    id: "p-dior-sauvage-edt",
    image: makeBottleSvg("Sauvage", "Dior • EDT"),
    brand: "Dior",
    name: "Sauvage (Eau de Toilette)",
    family: "Aromatic Fougère",
    baseVolume: 50,
    price: 119,
    currency: "₽",
    seasons: ["Весна", "Лето", "Осень", "Зима"],
    dayNight: ["День", "Ночь"],
    longevity: 4,
    sillage: 4,
    notes: {
      top: ["Калабрийский бергамот", "Перец"],
      heart: ["Сычуаньский перец", "Лаванда", "Розовый перец", "Ветивер", "Пачули", "Герань", "Элеми"],
      base: ["Амброксан", "Кедр", "Лабданум"],
    },
    tags: ["универсальный", "комплименты", "динамичный", "офис"],
    description:
      "Свежий пряно-древесный фужер: яркий бергамот, перец и мощная амбровая база. Очень узнаваемый и стойкий.",
  },
];
