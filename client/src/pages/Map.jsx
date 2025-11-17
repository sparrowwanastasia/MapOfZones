// MapPage.jsx
import React, { useMemo, useState, useEffect, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import LayerToggles from "../components/LayerToggles/LayerToggles";
import MapComponent from "../components/MapComponent/MapComponent";
import { SelectedMapsContext } from "../context/SelectedMapsContext";
import { GEOJSON_URL } from "../config/constants/constants";
import styles from "./Map.module.css";

const MapPage = () => {
  const [params] = useSearchParams();
  const searchQuery = params.get("q") || "";
  const [highLightDistrict, setHighlightDistrict] = useState("");
  const [activeLayers, setActiveLayers] = useState([]);
  const [activeDistrictName, setActiveDistrictName] = useState(null);
  const [error, setError] = useState("");
  const { selectedMaps, setSelectedMaps } = useContext(SelectedMapsContext);

  const toggleLayer = (key) => {
    setActiveLayers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Обновляем подсветку на карте и боковую панель при поиске
  useEffect(() => {
    if (searchQuery) {
      setHighlightDistrict(searchQuery.trim().toLowerCase());
      // Открываем боковую панель с отформатированным названием района
      let name = searchQuery.trim();
      if (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      setActiveDistrictName(name || null);
    } else {
      setHighlightDistrict("");
      setActiveDistrictName(null);
      setError("");
    }
  }, [searchQuery]);

  // Проверяем, найден ли район по поисковому запросу
  useEffect(() => {
    if (!searchQuery) return;
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => {
        let queryName = searchQuery.trim().toLowerCase();
        if (!queryName.startsWith("район ")) {
          queryName = "район " + queryName;
        }
        const found = data.features.find((f) => {
          const districtName =
            f.properties?.district?.toLowerCase() ||
            f.properties?.DISTRICT?.toLowerCase() ||
            "";
          return districtName === queryName;
        });
        setError(found ? "" : "Район не найден");
      })
      .catch((err) => {
        console.error("Search error:", err);
        setError("Ошибка поиска района");
      });
  }, [searchQuery]);

  // Добавление района в список сравнения
  const addToCompare = (districtName) => {
    if (!districtName) return;
    if (selectedMaps.some((item) => (item.name ?? item) === districtName)) {
      return; // уже добавлен
    }
    if (selectedMaps.length >= 4) {
      setError("Нельзя добавить более 4 районов");
      return;
    }
    // Создаем новый объект с заглушечными данными
    const dummyScoresList = [
      { eco: 7.2, transport: 9.1, noise: 4.3 },
      { eco: 8.0, transport: 8.7, noise: 5.1 },
      { eco: 6.4, transport: 9.3, noise: 5.8 },
      { eco: 7.0, transport: 8.5, noise: 6.0 },
    ];
    const index = selectedMaps.length % dummyScoresList.length;
    const newItem = {
      id: districtName,
      name: districtName,
      img: "https://via.placeholder.com/320x180",
      scores: dummyScoresList[index],
    };
    setSelectedMaps([...selectedMaps, newItem]);
    setError("");
  };

  // Обработчик выбора района (открытие/закрытие боковой панели)
  const handleDistrictClick = (name) => {
    setActiveDistrictName(name);
    if (!name) setError("");
  };

  const mapOptions = useMemo(
    () => ({
      activeLayers,
      // любые доп. настройки карты
    }),
    [activeLayers]
  );

  return (
    <>
      <div className={styles.layout}>
        {activeDistrictName && (
          <Sidebar>
            <h3 className={styles.title}>{activeDistrictName}</h3>
            <p>
              Оценочная информация: <span className={styles.text}>данные недоступны</span>
            </p>
            {error ? (
              <p className={styles.error}>{error}</p>
            ) : selectedMaps.some((item) => (item.name ?? item) === activeDistrictName) ? (
              <button disabled>Добавлено</button>
            ) : selectedMaps.length >= 4 ? (
              <p className={styles.error}>Нельзя добавить более 4 районов</p>
            ) : (
              <button onClick={() => addToCompare(activeDistrictName)}>Добавить в сравнение</button>
            )}
          </Sidebar>
        )}
        <main className={styles.mapArea}>
          <MapComponent
            options={mapOptions}
            highLightDistrict={highLightDistrict}
            activeDistrictName={activeDistrictName}
            onDistrictClick={handleDistrictClick}
          />
        </main>
      </div>
      <LayerToggles active={activeLayers} onToggle={toggleLayer} />
    </>
  );
};

export default MapPage;
