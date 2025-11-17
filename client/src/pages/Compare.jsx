// Compare.jsx
import React, { useContext } from "react";
import styles from "./Compare.module.css";
import { SelectedMapsContext } from "../context/SelectedMapsContext";

const Compare = () => {
  const { selectedMaps, setSelectedMaps } = useContext(SelectedMapsContext);

  const remove = (mapToRemove) => {
    setSelectedMaps((prevSelected) =>
      prevSelected.filter((map) =>
        map?.id != null && mapToRemove?.id != null
          ? map.id !== mapToRemove.id
          : map !== mapToRemove
      )
    );
  };

  return (
    <div className={styles.wrap}>
      <h2>Сравнение районов</h2>
      {selectedMaps.length === 0 ? (
        <p>Нет выбранных районов для сравнения.</p>
      ) : (
        <div className={styles.slider}>
          {selectedMaps.map((it) => (
            <div key={it?.id ?? it} className={styles.card}>
              <div className={styles.body}>
                <div className={styles.title}>{it.name}</div>
                {it.scores && (
                  <ul className={styles.metrics}>
                    <li>
                      Экология: <b>{it.scores.eco}</b>
                    </li>
                    <li>
                      Транспорт: <b>{it.scores.transport}</b>
                    </li>
                    <li>
                      Шум: <b>{it.scores.noise}</b>
                    </li>
                  </ul>
                )}
                <button className={styles.remove} onClick={() => remove(it)}>
                  Убрать из сравнения
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Compare;
