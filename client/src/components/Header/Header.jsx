/*
LayerToggles - это "панель фильтров карты" которая:
✅ Показывает доступные тематические слои
✅ Позволяет включать/выключать их отображение
✅ Визуально показывает какие слои активны
*/
import React from "react";                    // Основная библиотека React
import { Link, NavLink } from "react-router-dom"; // Компоненты для маршрутизации
import styles from "./Header.module.css";     // CSS-модуль для стилей (изолированные классы)
import SearchForm from "../SearchForm/SearchForm"; // Кастомный компонент формы поиска

// Объявляем функциональный компонент Header
// const Header = () => { ... } - стрелочная функция, возвращающая JSX
const Header = () => {
  // Возвращаем JSX-разметку компонента
  return (
    // HTML-тег header с CSS-классом из модуля
    // className={styles.header} - обращение к классу .header из CSS-модуля
    <header className={styles.header}>
      
      {/* Контейнер для содержимого шапки */}
      <div className={styles.headerContainer}>
        
        {/* Ссылка-логотип на главную страницу */}
        {/* Link - компонент React Router для навигации без перезагрузки страницы */}
        <Link to="/" className={styles.logo}>
          MapOfZones  {/* Текст логотипа */}
        </Link>

        {/* Правая часть шапки - навигация и поиск */}
        <div className={styles.headerInfoContainer}>
          
          {/* Навигационное меню */}
          <nav className={styles.headerNav}>
            
            {/* Умная ссылка на главную страницу */}
            {/* NavLink - специальная ссылка, которая знает активна ли она */}
            <NavLink
              to="/"  // Путь назначения - главная страница
              // className принимает функцию, которая возвращает строку классов
              // { isActive } - деструктуризация параметра (isActive = true/false)
              className={({ isActive }) =>
               // Тернарный оператор: условие ? значение_если_true : значение_если_false
    // Если isActive = true, добавится styles.navLinkActive
    // Если isActive = false, добавится пустая строка ""
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Главная  {/* Текст ссылки */}
            </NavLink>

            {/* Ссылка на страницу карты */}
            <NavLink
              to="/map"  // Путь к странице карты
              className={({ isActive }) =>
                // Если страница "/map" активна - добавится styles.navLinkActive
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Карта
            </NavLink>

            {/* Ссылка на страницу сравнения */}
            <NavLink
              to="/compare"  // Путь к странице сравнения
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Сравнение
            </NavLink>

            {/* Ссылка на админ-панель */}
            <NavLink
              to="/admin"  // Путь к админ-панели
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Админ
            </NavLink>
            
          </nav>  {/* Конец навигационного меню */}

          {/* Компонент формы поиска */}
          {/* SearchForm - кастомный компонент, который мы импортировали */}
          <SearchForm />
          
        </div>
      </div>
    </header>
  );
};

// Экспортируем компонент для использования в других файлах
// export default - позволяет импортировать компонент под любым именем
export default Header;