import React from "react";
import styles from "./LayerToggles.module.css";

const BUTTONS = [
  { key: "eco", label: "Экология" },
  { key: "social", label: "Социальный" },
  { key: "transport", label: "Транспорт" },
  { key: "noise", label: "Шум" },
  { key: "crime", label: "Криминогенный" },
  { key: "history", label: "История" },
];

export default function LayerToggles({ active = [], onToggle }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {BUTTONS.map((b) => {
          const isOn = active.includes(b.key);
          return (
            <button
              key={b.key}
              className={`${styles.btn} ${isOn ? styles.btnOn : ""}`}
              onClick={() => onToggle?.(b.key)}
              type="button"
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
