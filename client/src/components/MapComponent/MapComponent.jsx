// MapComponent.jsx (исправленный)
import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import { SelectedMapsContext } from "../../context/SelectedMapsContext.js";
import L from "leaflet";
import styles from "./MapComponents.module.css";
import { MAP_CONFIGS, GEOJSON_URL } from "../../config/constants/constants.js";

const PARKS_API_URL = `https://apidata.mos.ru/v1/datasets/1465/features?api_key=ВАШ_API_КЛЮЧ`;

export const defaultStyle = {
  color: "#3388ff",
  weight: 1,
  fillOpacity: 0.3,
  fillColor: "#3388ff"
};

const selectedStyle = {
  color: "#ff3333",
  weight: 2,
  fillColor: "#ff3333",
  fillOpacity: 0.55,
};

const highlightStyle = {
  color: "#ff3333",
  weight: 3,
  fillColor: "#ff3333",
  fillOpacity: 0.7,
};

const normalizeDistrictName = (name) => (name ?? "").toString().trim().toLowerCase();

const MapComponent = ({ options, highLightDistrict, activeDistrictName, onDistrictClick, activeLayers = [] }) => {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const geojsonRef = useRef(null);
  const ecoLayerRef = useRef(null);
  const [selected, setSelected] = useState(new Set());
  const { selectedMaps, setSelectedMaps } = useContext(SelectedMapsContext);
  const layersByDistrictRef = useRef(new Map());
  const highlightedLayerRef = useRef(null);
  const highlightDistrictValueRef = useRef("");
  const selectedNamesRef = useRef(new Set());
  const activeNameRef = useRef(activeDistrictName);
  const onDistrictClickRef = useRef(onDistrictClick);

  useEffect(() => { activeNameRef.current = activeDistrictName; }, [activeDistrictName]);
  useEffect(() => { onDistrictClickRef.current = onDistrictClick; }, [onDistrictClick]);

  // Обновление selected при изменении selectedMaps
  useEffect(() => {
    const newSelected = new Set();
    selectedMaps.forEach((item) => {
      let nm = (item?.name ?? item).toString().trim();
      const prefix = nm.split(" ")[0].toLowerCase();
      const nameWithPrefix = prefix === "район" ? nm : `район ${nm}`;
      newSelected.add(nameWithPrefix);
    });
    setSelected(newSelected);
    selectedNamesRef.current = newSelected;
  }, [selectedMaps]);

  // Функция обновления стилей всех слоев
  const updateAllLayerStyles = useCallback(() => {
    const layersMap = layersByDistrictRef.current;
    if (!layersMap) return;

    layersMap.forEach((layer) => {
      const districtName = layer.__districtName;
      const isSelected = selected.has(districtName);
      const isHighlighted = highlightedLayerRef.current === layer;

      if (isHighlighted) {
        layer.setStyle(highlightStyle);
      } else if (isSelected) {
        layer.setStyle(selectedStyle);
      } else {
        layer.setStyle(defaultStyle);
      }
    });
  }, [selected]);

  const applyHighlight = useCallback((districtName) => {
    const normalized = normalizeDistrictName(districtName);
    highlightDistrictValueRef.current = districtName;
    const layersMap = layersByDistrictRef.current;
    if (!layersMap) return;

    const currentLayer = highlightedLayerRef.current;
    if (currentLayer) {
      const layerDistrictName = currentLayer.__districtName;
      const isStillSelected = layerDistrictName && selected.has(layerDistrictName);
      currentLayer.setStyle(isStillSelected ? selectedStyle : defaultStyle);
      highlightedLayerRef.current = null;
    }

    if (!normalized) return;
    const targetLayer = layersMap.get(normalized);
    if (!targetLayer) return;
    targetLayer.setStyle(highlightStyle);
    highlightedLayerRef.current = targetLayer;
    if (targetLayer.openTooltip) targetLayer.openTooltip();
    if (leafletRef.current && targetLayer.getBounds) {
      leafletRef.current.fitBounds(targetLayer.getBounds(), { padding: [40, 40], maxZoom: 14 });
    }
  }, [selected]);

  // Инициализация карты - только один раз
  useEffect(() => {
    if (leafletRef.current) return;

    const map = L.map(mapRef.current, {
      preferCanvas: true, // Включить canvas рендеринг
      renderer: L.canvas() // Явно указать canvas рендерер
    }).setView([MAP_CONFIGS.INITIAL_LAT, MAP_CONFIGS.INITIAL_LONG], MAP_CONFIGS.INITIAL_ZOOM);

    leafletRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
      tileSize: 256,
  detectRetina: false,
  keepBuffer: 8
    }).addTo(map);

    // Загрузить GeoJSON
    fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить GeoJSON");
        return res.json();
      })
      .then((data) => {
        if (geojsonRef.current) {
          leafletRef.current.removeLayer(geojsonRef.current);
          geojsonRef.current = null;
        }
        layersByDistrictRef.current.clear();

        const layer = L.geoJSON(data, {
          style: defaultStyle, // Единый стиль по умолчанию
          onEachFeature: (feature, lyr) => {
            const name = feature?.properties?.district || feature?.properties?.DISTRICT || "Unknown";
            const normalizedName = normalizeDistrictName(name);

            lyr.__districtName = name;
            layersByDistrictRef.current.set(normalizedName, lyr);
            lyr.bindTooltip(name, { sticky: true });

            lyr.on("click", () => {
              const alreadySelected = selectedNamesRef.current.has(name);
              if (alreadySelected) {
                setSelectedMaps((prev) => prev.filter((item) => (item?.name ?? item) !== name));
                lyr.setStyle(defaultStyle);
                if (name === activeNameRef.current) onDistrictClickRef.current(null);
              } else {
                applyHighlight(name);
                const displayName = name.replace(/^район\s+/i, "");
                const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                onDistrictClickRef.current(formattedName);
              }
            });
          },
        }).addTo(leafletRef.current);

        geojsonRef.current = layer;
        applyHighlight(highlightDistrictValueRef.current);
      })
      .catch((e) => console.error("Ошибка загрузки GeoJSON:", e));
  }, []);

  // Обновление стилей при изменении selected
  useEffect(() => {
    updateAllLayerStyles();
  }, [selected, updateAllLayerStyles]);

  // Эко-слои
  useEffect(() => {
    if (!leafletRef.current || !activeLayers.includes("eco")) {
      if (ecoLayerRef.current) {
        leafletRef.current.removeLayer(ecoLayerRef.current);
        ecoLayerRef.current = null;
      }
      return;
    }

    fetch(PARKS_API_URL)
      .then((res) => res.json())
      .then((data) => {
        if (ecoLayerRef.current) leafletRef.current.removeLayer(ecoLayerRef.current);
        const layer = L.geoJSON(data, {
          style: {
            color: "#2a7f32",
            fillColor: "#7ed68b",
            fillOpacity: 0.4,
            weight: 1,
          },
          onEachFeature: (feature, lyr) => {
            const name = feature?.properties?.Attributes?.Name;
            if (name) lyr.bindTooltip(name);
          }
        }).addTo(leafletRef.current);
        ecoLayerRef.current = layer;
      })
      .catch((err) => console.error("Ошибка загрузки парков: ", err));
  }, [activeLayers]);

  // Подсветка района
  useEffect(() => {
    const districtName = (() => {
      if (!highLightDistrict) return "";
      const [prefix] = highLightDistrict.split(" ");
      return prefix === "район" ? highLightDistrict : `район ${highLightDistrict}`;
    })();
    applyHighlight(districtName);
  }, [highLightDistrict, applyHighlight]);

  return (
    <div className={styles.wrapper}>
      <div ref={mapRef} className={styles.map} />
      <div className={styles.sidebar}>Выбрано районов: {selected.size}</div>
    </div>
  );
};

export default MapComponent;