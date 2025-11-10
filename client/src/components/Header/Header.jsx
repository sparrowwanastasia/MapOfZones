import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';
import SearchForm from '../SearchForm/SearchForm';

const Header = () => {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>MapOfZones</Link>

      <nav className={styles.nav}>
        <NavLink to="/" className={({isActive}) => isActive ? styles.active : ''}>Главная</NavLink>
        <NavLink to="/map" className={({isActive}) => isActive ? styles.active : ''}>Карта</NavLink>
        <NavLink to="/compare" className={({isActive}) => isActive ? styles.active : ''}>Сравнение</NavLink>
        <NavLink to="/admin" className={({isActive}) => isActive ? styles.active : ''}>Админ</NavLink>
      </nav>

      <SearchForm />
    </header>
  );
};

export default Header;

