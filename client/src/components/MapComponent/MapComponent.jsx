// client/src/components/MapComponent/MapComponent.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import styles from "./MapComponents.module.css"; // просто чтобы задать высоту контейнера
import { MAP_CONFIGS, GEOJSON_URL } from "../../config/constants/constants.js";

export const defaultStyle = {
  color: "#3388ff",
  weight: 1,
  fillOpacity: 0.3,
};

const selectedStyle = {
  color: "#ff3333",
  weight: 2,
  fillColor: "#ff3333",
  fillOpacity: 0.55,
};

export default function MapComponent() {
  const mapRef = useRef(null); // ссылка на DOM-элемент <div>
  const leafletRef = useRef(null); // экземпляр карты L.Map
  const geojsonRef = useRef(null); // слой L.GeoJSON
  const [selected, setSelected] = useState(() => new Set()); // выбранные районы

  useEffect(() => {
    if (selected.size > 0) {
      // если выбран хоть один район — показываем тост
      // или можно показать сообщение на странице
      console.log(selected);
    }
  }, [selected]); // эффект срабатывает при изменении selected

  // 1) создаём карту единожды
  useEffect(() => {
    if (leafletRef.current) return; // уже создана
    const map = L.map(mapRef.current).setView(
      [MAP_CONFIGS.INITIAL_LAT, MAP_CONFIGS.INITIAL_LONG],
      MAP_CONFIGS.INITIAL_ZOOM
    );
    leafletRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);
  }, []);

  // 2) грузим GeoJSON и вешаем обработчики
  useEffect(() => {
    if (!leafletRef.current) return;

    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Не удалось загрузить GeoJSON");
        return r.json();
      })
      .then((data) => {
        // если раньше уже был слой — удалим
        if (geojsonRef.current) {
          geojsonRef.current.remove();
          geojsonRef.current = null;
        }

        const layer = L.geoJSON(data, {
          style: (feature) => {
            const name =
              feature?.properties?.district ||
              feature?.properties?.DISTRICT ||
              "Unknown";
            return selected.has(name) ? selectedStyle : defaultStyle;
          },
          onEachFeature: (feature, lyr) => {
            const name =
              feature?.properties?.district ||
              feature?.properties?.DISTRICT ||
              "Unknown";

            // небольшая подпись при наведении
            lyr.bindTooltip(name, { sticky: true });

            // Клик по району на карте
            lyr.on("click", () => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(name)) {
                  next.delete(name);
                  lyr.setStyle(defaultStyle);
                  // sendSelection(name, "remove"); // опционально — запрос на бэк
                } else {
                  next.add(name);
                  lyr.setStyle(selectedStyle);
                  // sendSelection(name, "add"); // опционально — запрос на бэк
                }
                return next;
              });
            });
          },
        }).addTo(leafletRef.current);

        geojsonRef.current = layer;
      })
      .catch((e) => {
        console.error(e);
        // можно показать тост/сообщение на странице
      });
  }, [selected]); // пересчёт стилей при изменении выбранных

  // 3) (опционально) отправка выбора на бэкенд
  async function sendSelection(districtName, action) {
    try {
      await fetch("/api/selected-districts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "X-CSRFToken": getCookie("csrftoken"), // если нужно
        },
        body: JSON.stringify({ district: districtName, action }),
      });
    } catch (e) {
      console.warn("Не удалось отправить выбор:", e);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div ref={mapRef} className={styles.map} />
      {/* пример: счётчик выбранных */}
      <div className={styles.sidebar}>Выбрано районов: {selected.size}</div>
    </div>
  );
}
