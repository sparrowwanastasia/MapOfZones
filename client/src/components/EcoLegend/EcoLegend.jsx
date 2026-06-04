import React from "react";
import styles from "./EcoLegend.module.css";

export default function EcoLegend({ visible }) {
  if (!visible) return null;

  return (
    <div className={styles.card}>
      <div className={styles.title}>Шкала экологии</div>

      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.g}`} />
        <div>
          <div className={styles.range}>8–10</div>
          <div className={styles.label}>Хорошая экология</div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.y}`} />
        <div>
          <div className={styles.range}>6–7.9</div>
          <div className={styles.label}>Выше среднего</div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.o}`} />
        <div>
          <div className={styles.range}>4–5.9</div>
          <div className={styles.label}>Средняя</div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.oo}`} />
        <div>
          <div className={styles.range}>2–3.9</div>
          <div className={styles.label}>Ниже среднего</div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.r}`} />
        <div>
          <div className={styles.range}>0–1.9</div>
          <div className={styles.label}>Плохая</div>
        </div>
      </div>
    </div>
  );
}
