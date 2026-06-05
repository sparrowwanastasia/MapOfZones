import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div
            className={styles.brand}
            role="button"
            tabIndex={0}
            onClick={() => navigate("/")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/")}
            aria-label="MapOfZones"
          >
            <span>MAP</span>
            <span>OFZONES</span>
          </div>

          <p className={styles.description}>
            Веб-сервис оценки жилой застройки на основе многокритериального анализа
          </p>
        </div>

        <div className={styles.right}>
          <span>Москва</span>
          <span>Интерактивная карта районов</span>
        </div>
      </div>
    </footer>
  );
}