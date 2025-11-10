import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Main.module.css';

const Main = () => {
  return (
    <section className={styles.hero}>
      <h1>Оценка районов Москвы</h1>
      <p>Карта, слои оценки (экология, транспорт, шум и др.) и сравнение районов.</p>
      <div className={styles.actions}>
        <Link to="/map" className={styles.btn}>Открыть карту</Link>
        <Link to="/compare" className={styles.link}>Сравнение районов</Link>
      </div>
    </section>
  );
};

export default Main;

