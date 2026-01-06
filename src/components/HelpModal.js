import React from "react";
import { THEME } from "../data/theme";
import Modal from "./Modal";

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} title="Как работает подбор" onClose={onClose}>
      <div className="space-y-3 text-sm" style={{ color: THEME.text }}>
        <p><span className="font-semibold">Ноты</span>: берём верх/сердце/базу и считаем совпадения с "Хочу слышать".</p>
        <p><span className="font-semibold">Исключения</span>: если "Не подходит" встречается в пирамиде — рейтинг падает.</p>
        <p><span className="font-semibold">Сезон и время суток</span>: мягкие бонусы для уместности.</p>
        <p style={{ color: THEME.muted }}>Для быстрого результата: 2–4 "Хочу" + 0–2 "Исключить", затем сезон.</p>
      </div>
    </Modal>
  );
}
