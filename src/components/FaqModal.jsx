import React from "react";
import { THEME } from "../data/theme";
import Modal from "./Modal";

export default function FaqModal({ open, onClose }) {
  return (
    <Modal open={open} title="FAQ по подбору" onClose={onClose}>
      <div className="space-y-3 text-sm" style={{ color: THEME.text }}>
        <div>
          <div className="font-semibold">Как пользоваться подбором по нотам?</div>
          <div className="mt-1" style={{ color: THEME.muted }}>
            Выберите ноты в фильтрах — мы покажем ароматы, где они присутствуют в пирамиде.
          </div>
        </div>
        <div>
          <div className="font-semibold">Можно ли подобрать аромат по сезону и времени дня?</div>
          <div className="mt-1" style={{ color: THEME.muted }}>
            Да, используйте фильтры «Сезоны» и «Время дня», чтобы сузить выбор.
          </div>
        </div>
        <div>
          <div className="font-semibold">Что делать, если ничего не найдено?</div>
          <div className="mt-1" style={{ color: THEME.muted }}>
            Очистите часть фильтров или поиск — так можно расширить список подходящих ароматов.
          </div>
        </div>
      </div>
    </Modal>
  );
}
