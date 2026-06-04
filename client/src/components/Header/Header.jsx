import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
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

        <nav className={styles.nav} aria-label="Навигация">
          <NavLink to="/" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
            Главная
          </NavLink>

          <NavLink to="/compare" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
            Сравнение
          </NavLink>

          <NavLink to="/admin" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
            Админ
          </NavLink>

          <NavLink to="/legend" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
            Легенда
          </NavLink>
        </nav>

        <div className={styles.right}>
          <button className={styles.cta} type="button" onClick={() => navigate("/map")}>
            Открыть карту
          </button>
        </div>
      </div>
    </header>
  );
}