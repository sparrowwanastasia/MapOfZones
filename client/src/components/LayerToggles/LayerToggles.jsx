// LayerToggles.jsx
import React from "react";
import styles from "./LayerToggles.module.css";
import { LayersContext } from "../../context/LayersContext";

export default function LayerToggles({ active = [], onToggle = () => {} }) {
  const layers = [
    { key: "eco", label: "Экология" },
    { key: "social", label: "Социальный" },
    { key: "transport", label: "Транспорт" },
    { key: "noise", label: "Шум" },
    { key: "crime", label: "Криминогенный" },
    { key: "history", label: "История" },
  ];

  return (
    <div className={styles.wrap}>
      {layers.map((l) => (
        <button
          key={l.key}
          type="button"
          className={`${styles.btn} ${active.includes(l.key) ? styles.active : ""}`}
          onClick={() => onToggle(l.key)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}