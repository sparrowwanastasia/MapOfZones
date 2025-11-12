import React, { useContext } from "react";
import styles from "./Compare.module.css";
import { SelectedMapsContext } from "../context/SelectedMapsContext";

// const mock = [
//   {
//     id: 1,
//     name: "Тверской",
//     img: "https://via.placeholder.com/320x180",
//     scores: { eco: 7.2, transport: 9.1, noise: 4.3 },
//   },
//   {
//     id: 2,
//     name: "Хамовники",
//     img: "https://via.placeholder.com/320x180",
//     scores: { eco: 8.0, transport: 8.7, noise: 5.1 },
//   },
//   {
//     id: 3,
//     name: "Пресненский",
//     img: "https://via.placeholder.com/320x180",
//     scores: { eco: 6.4, transport: 9.3, noise: 5.8 },
//   },
// ];

const Compare = () => {
  //const [items, setItems] = useState(mock);

  const { selectedMaps, setSelectedMaps } = useContext(SelectedMapsContext);

  // TODO: вот тут надо дергать по API для карт данные об их статистике для каждой карты.

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

      <div className={styles.slider}>
        {selectedMaps.map((it) => (
          <div key={it?.id ?? it} className={styles.card}>
            <img src={it.img} alt={it.name} className={styles.img} />
            <div className={styles.body}>
              <div className={styles.title}>{it.name}</div>
              {/* <ul className={styles.metrics}>
                <li>
                  Экология: <b>{it.scores.eco}</b>
                </li>
                <li>
                  Транспорт: <b>{it.scores.transport}</b>
                </li>
                <li>
                  Шум: <b>{it.scores.noise}</b>
                </li>
              </ul> */}
              <button className={styles.remove} onClick={() => remove(it)}>
                Убрать из сравнения
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TODO: тут будет блок «добавить район в сравнение» через поиск / выбор на карте */}
    </div>
  );
};

export default Compare;
