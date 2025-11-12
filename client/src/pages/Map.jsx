import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import LayerToggles from "../components/LayerToggles/LayerToggles";
import MapComponent from "../components/MapComponent/MapComponent";
import styles from "./Map.module.css";

const MapPage = () => {
  const [params] = useSearchParams();
  const [highLightDistrict, setHighlightDistrict] = useState("");
  const searchQuery = params.get("q") || "";

  const [activeLayers, setActiveLayers] = useState([]);

  const toggleLayer = (key) => {
    setActiveLayers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // заготовка: реакция карты на параметр поиска (можно подсветить район)
  useEffect(() => {
    if (searchQuery) {
      // TODO: пробросить в MapComponent для подсветки найденного района
      // например setHighlightDistrict(searchQuery)
      setHighlightDistrict(searchQuery.trim().toLowerCase());
    }
  }, [searchQuery]);

  // пропсы на карту: цвета слоёв, активность слоёв
  const mapOptions = useMemo(
    () => ({
      activeLayers,
      // любые доп. настройки карты
    }),
    [activeLayers]
  );

  return (
    <div className={styles.layout}>
      <Sidebar>
        <h3 className={styles.title}>Слои оценки</h3>
        <LayerToggles active={activeLayers} onToggle={toggleLayer} />

        <div className={styles.box}>
          <div className={styles.caption}>Поиск</div>
          <div className={styles.text}>
            {searchQuery
              ? `Запрос: “${searchQuery}”`
              : "Введите запрос в шапке"}
          </div>
        </div>
      </Sidebar>

      <main className={styles.mapArea}>
        <MapComponent
          options={mapOptions}
          highLightDistrict={highLightDistrict}
        />
      </main>
    </div>
  );
};

export default MapPage;
