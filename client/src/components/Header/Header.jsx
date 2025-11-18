import React from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import SearchForm from "../SearchForm/SearchForm";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.logo}>
          MapOfZones
        </Link>
        <div className={styles.headerInfoContainer}>
          <nav className={styles.headerNav}>
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Главная
            </NavLink>
            <NavLink 
              to="/map" 
              className={({ isActive }) => 
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Карта
            </NavLink>
            <NavLink 
              to="/compare" 
              className={({ isActive }) => 
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Сравнение
            </NavLink>
            <NavLink 
              to="/admin" 
              className={({ isActive }) => 
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Админ
            </NavLink>
          </nav>
          <SearchForm />
        </div>
      </div>
    </header>
  );
};

export default Header;
