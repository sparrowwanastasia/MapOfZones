// src/components/MapComponent/MapComponent.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from "react";
import L from "leaflet";
import styles from "./MapComponents.module.css";
import { SelectedMapsContext } from "../../context/SelectedMapsContext.js";
import { useEcologyData } from "../../hooks/useEcologyData";
import { useParksData } from "../../hooks/useParksData";
import { useHazardData } from "../../hooks/useHazardData";
import { MAP_CONFIGS, GEOJSON_URL } from "../../config/constants/constants.js";

export const defaultStyle = {
  color: "#3388ff",
  weight: 1,
  fillOpacity: 0.3,
  fillColor: "#3388ff",
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

const normalizeDistrictName = (name) =>
  (name ?? "").toString().trim().toLowerCase();

const MapComponent = ({
  options = {},
  highLightDistrict,
  activeDistrictName,
  onDistrictClick,
  onError,
}) => {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const geojsonRef = useRef(null);

  // Leaflet-слои с зелёными объектами
  const ecoYardsLayerRef = useRef(null);   // дворы (64036)
  const ecoParksLayerRef = useRef(null);   // парки (1465)
  const ecoHazardLayerRef = useRef(null);  // опасные объекты (hazards.geojson)

  const [selected, setSelected] = useState(new Set());
  const { selectedMaps, setSelectedMaps } = useContext(SelectedMapsContext);

  const layersByDistrictRef = useRef(new Map());
  const highlightedLayerRef = useRef(null);
  const highlightDistrictValueRef = useRef("");
  const selectedNamesRef = useRef(new Set());
  const activeNameRef = useRef(activeDistrictName);
  const onDistrictClickRef = useRef(onDistrictClick);

  const activeLayers = options.activeLayers || [];
  const ecoActive = activeLayers.includes("eco");

  // данные экологии (загружаем всегда, чтобы могли считать статистику)
  const {
    data: yardsGeoJSON,
    error: yardsError,
  } = useEcologyData(true);
  const {
    data: parksGeoJSON,
    error: parksError,
  } = useParksData(true);
  const {
    data: hazardGeoJSON,
    error: hazardError,
  } = useHazardData(true);

  useEffect(() => {
    activeNameRef.current = activeDistrictName;
  }, [activeDistrictName]);

  useEffect(() => {
    onDistrictClickRef.current = onDistrictClick;
  }, [onDistrictClick]);

  // синхронизация выделенных районов по списку сравнения
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

  const applyHighlight = useCallback(
    (districtName) => {
      const normalized = normalizeDistrictName(districtName);
      highlightDistrictValueRef.current = districtName;
      const layersMap = layersByDistrictRef.current;
      if (!layersMap) return;

      const currentLayer = highlightedLayerRef.current;
      if (currentLayer) {
        const layerDistrictName = currentLayer.__districtName;
        const isStillSelected =
          layerDistrictName && selected.has(layerDistrictName);
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
        leafletRef.current.fitBounds(targetLayer.getBounds(), {
          padding: [40, 40],
          maxZoom: 14,
        });
      }
    },
    [selected]
  );

  /**
   * Считаем, сколько дворов, парков и опасных объектов попадает
   * центром в bounds района. Счёт по реально отрисованным слоям Leaflet.
   * ВСЕГДА возвращаем объект {yards, parks, hazards}.
   */
  const countEcoInDistrictLayer = useCallback((districtLayer) => {
    const result = { yards: 0, parks: 0, hazards: 0 };

    if (!districtLayer) return result;
    const districtBounds = districtLayer.getBounds();
    if (!districtBounds) return result;

    if (ecoYardsLayerRef.current) {
      ecoYardsLayerRef.current.eachLayer((l) => {
        let center = null;
        if (l.getLatLng) center = l.getLatLng();
        else if (l.getBounds) center = l.getBounds().getCenter();
        if (!center) return;
        if (districtBounds.contains(center)) {
          result.yards += 1;
        }
      });
    }

    if (ecoParksLayerRef.current) {
      ecoParksLayerRef.current.eachLayer((l) => {
        let center = null;
        if (l.getLatLng) center = l.getLatLng();
        else if (l.getBounds) center = l.getBounds().getCenter();
        if (!center) return;
        if (districtBounds.contains(center)) {
          result.parks += 1;
        }
      });
    }

    if (ecoHazardLayerRef.current) {
      ecoHazardLayerRef.current.eachLayer((l) => {
        let center = null;
        if (l.getLatLng) center = l.getLatLng();
        else if (l.getBounds) center = l.getBounds().getCenter();
        if (!center) return;
        if (districtBounds.contains(center)) {
          result.hazards += 1;
        }
      });
    }

    console.log(
      "Eco stats (bounds)",
      districtLayer.__districtName,
      "yards:", result.yards,
      "parks:", result.parks,
      "hazards:", result.hazards
    );

    return result;
  }, []);

  // инициализация карты
  useEffect(() => {
    if (leafletRef.current) return;

    const map = L.map(mapRef.current, {
      preferCanvas: true,
      renderer: L.canvas(),
    }).setView(
      [MAP_CONFIGS.INITIAL_LAT, MAP_CONFIGS.INITIAL_LONG],
      MAP_CONFIGS.INITIAL_ZOOM
    );

    leafletRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        tileSize: 256,
        detectRetina: false,
        keepBuffer: 8,
      }
    ).addTo(map);

    // Районы Москвы
    fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить GeoJSON районов");
        return res.json();
      })
      .then((data) => {
        if (geojsonRef.current && leafletRef.current) {
          leafletRef.current.removeLayer(geojsonRef.current);
          geojsonRef.current = null;
        }

        layersByDistrictRef.current.clear();

        const layer = L.geoJSON(data, {
          style: defaultStyle,
          onEachFeature: (feature, lyr) => {
            const name =
              feature?.properties?.district ||
              feature?.properties?.DISTRICT ||
              "Unknown";
            const normalizedName = normalizeDistrictName(name);

            lyr.__districtName = name;
            layersByDistrictRef.current.set(normalizedName, lyr);
            lyr.bindTooltip(name, { sticky: true });

            lyr.on("click", () => {
              const alreadySelected = selectedNamesRef.current.has(name);

              if (alreadySelected) {
                setSelectedMaps((prev) =>
                  prev.filter((item) => (item?.name ?? item) !== name)
                );
                lyr.setStyle(defaultStyle);
                if (name === activeNameRef.current) {
                  onDistrictClickRef.current?.(null, null);
                }
              } else {
                applyHighlight(name);

                const displayName = name.replace(/^район\s+/i, "");
                const formattedName =
                  displayName.charAt(0).toUpperCase() + displayName.slice(1);

                const ecoStats = countEcoInDistrictLayer(lyr);

                onDistrictClickRef.current?.(formattedName, ecoStats);
              }
            });
          },
        }).addTo(leafletRef.current);

        geojsonRef.current = layer;
        applyHighlight(highlightDistrictValueRef.current);
      })
      .catch((e) => {
        console.error("Ошибка загрузки GeoJSON:", e);
        onError?.(e);
      });
  }, [applyHighlight, onError, setSelectedMaps, countEcoInDistrictLayer]);

  // обновление стилей районов
  useEffect(() => {
    updateAllLayerStyles();
  }, [selected, updateAllLayerStyles]);

  // ЭКО-слои: дворы, парки, опасные объекты (визуализация)
  useEffect(() => {
    if (!leafletRef.current) return;

    // если слой "экология" выключен — убираем зелёные слои с карты
    if (!ecoActive) {
      if (ecoYardsLayerRef.current) {
        leafletRef.current.removeLayer(ecoYardsLayerRef.current);
        ecoYardsLayerRef.current = null;
      }
      if (ecoParksLayerRef.current) {
        leafletRef.current.removeLayer(ecoParksLayerRef.current);
        ecoParksLayerRef.current = null;
      }
      if (ecoHazardLayerRef.current) {
        leafletRef.current.removeLayer(ecoHazardLayerRef.current);
        ecoHazardLayerRef.current = null;
      }
      return;
    }

    if (yardsError) {
      console.error("Ошибка дворовых территорий:", yardsError);
      onError?.(yardsError);
    }
    if (parksError) {
      console.error("Ошибка парков:", parksError);
      onError?.(parksError);
    }
    if (hazardError) {
      console.error("Ошибка опасных объектов:", hazardError);
      onError?.(hazardError);
    }

    // Дворы (64036)
    if (yardsGeoJSON && ecoActive) {
      if (ecoYardsLayerRef.current) {
        leafletRef.current.removeLayer(ecoYardsLayerRef.current);
        ecoYardsLayerRef.current = null;
      }

      const yardsLayer = L.geoJSON(yardsGeoJSON, {
        style: {
          color: "#00ff7f",
          weight: 1,
          fillColor: "#00ff7f",
          fillOpacity: 0.2,
        },
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 4,
            color: "#00ff7f",
            fillColor: "#00ff7f",
            fillOpacity: 0.7,
            weight: 1,
          }),
        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const attrs = props.Attributes || props;

          const addr =
            attrs.Address ||
            attrs.ShortAddress ||
            attrs.FullAddress ||
            attrs.Location ||
            attrs.Name ||
            attrs.ObjectName;

          const text = addr
            ? `Дворовая территория: ${addr}`
            : "Дворовая территория";

          lyr.bindTooltip(text);
        },
      }).addTo(leafletRef.current);

      ecoYardsLayerRef.current = yardsLayer;
    }

    // Парки (1465)
    if (parksGeoJSON && ecoActive) {
      if (ecoParksLayerRef.current) {
        leafletRef.current.removeLayer(ecoParksLayerRef.current);
        ecoParksLayerRef.current = null;
      }

      const parksLayer = L.geoJSON(parksGeoJSON, {
        style: {
          color: "#32cd32",
          weight: 1.5,
          fillColor: "#32cd32",
          fillOpacity: 0.35,
        },
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 5,
            color: "#32cd32",
            fillColor: "#32cd32",
            fillOpacity: 0.85,
            weight: 1,
          }),
        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const attrs = props.Attributes || props;

          const name =
            attrs.Name ||
            attrs.ParkName ||
            attrs.CommonName ||
            attrs.ObjectName ||
            attrs.FullName ||
            "Парк";

          lyr.bindTooltip(name);
        },
      }).addTo(leafletRef.current);

      ecoParksLayerRef.current = parksLayer;
    }

    // Опасные объекты (hazards.geojson)
    if (hazardGeoJSON && ecoActive) {
      if (ecoHazardLayerRef.current) {
        leafletRef.current.removeLayer(ecoHazardLayerRef.current);
        ecoHazardLayerRef.current = null;
      }

      const hazardLayer = L.geoJSON(hazardGeoJSON, {
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 6,
            color: "#ff3333",
            fillColor: "#ff6600",
            fillOpacity: 0.9,
            weight: 1,
          }),
        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const name =
            props.name ||
            props["name:ru"] ||
            props.Name ||
            props.title ||
            "Опасный объект";

          const type =
            props.type ||
            props.category ||
            props.kind ||
            "";

          const text = type ? `${type}: ${name}` : `Опасный объект: ${name}`;
          lyr.bindTooltip(text);
        },
      }).addTo(leafletRef.current);

      ecoHazardLayerRef.current = hazardLayer;
    }
  }, [
    ecoActive,
    yardsGeoJSON,
    parksGeoJSON,
    hazardGeoJSON,
    yardsError,
    parksError,
    hazardError,
    onError,
  ]);

  // подсветка по поиску
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
