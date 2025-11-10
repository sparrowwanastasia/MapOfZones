import React, { useState } from 'react';
import styles from './Compare.module.css';

const mock = [
  { id: 1, name: 'Тверской', img: 'https://via.placeholder.com/320x180', scores: { eco: 7.2, transport: 9.1, noise: 4.3 } },
  { id: 2, name: 'Хамовники', img: 'https://via.placeholder.com/320x180', scores: { eco: 8.0, transport: 8.7, noise: 5.1 } },
  { id: 3, name: 'Пресненский', img: 'https://via.placeholder.com/320x180', scores: { eco: 6.4, transport: 9.3, noise: 5.8 } },
];

const Compare = () => {
  const [items, setItems] = useState(mock);

  const remove = (id) => setItems(items.filter(i => i.id !== id));

  return (
    <div className={styles.wrap}>
      <h2>Сравнение районов</h2>

      <div className={styles.slider}>
        {items.map(it => (
          <div key={it.id} className={styles.card}>
            <img src={it.img} alt={it.name} className={styles.img} />
            <div className={styles.body}>
              <div className={styles.title}>{it.name}</div>
              <ul className={styles.metrics}>
                <li>Экология: <b>{it.scores.eco}</b></li>
                <li>Транспорт: <b>{it.scores.transport}</b></li>
                <li>Шум: <b>{it.scores.noise}</b></li>
              </ul>
              <button className={styles.remove} onClick={() => remove(it.id)}>Убрать из сравнения</button>
            </div>
          </div>
        ))}
      </div>

      {/* TODO: тут будет блок «добавить район в сравнение» через поиск / выбор на карте */}
    </div>
  );
};

export default Compare;
