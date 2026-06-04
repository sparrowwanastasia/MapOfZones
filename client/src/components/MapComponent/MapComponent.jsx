import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import styles from "./MapComponents.module.css";
import {
  MAP_CONFIGS,
  GEOJSON_URL,
  ECO_SUMMARY_URL,
  ECO_DISTRICT_URL,
  DISTRICTS_INDEX_URL,
  SOCIAL_SUMMARY_URL,
  SOCIAL_DISTRICT_URL,
  NOISE_SUMMARY_URL,
  NOISE_DISTRICT_URL,
} from "../../config/constants/constants.js";

export const defaultStyle = {
  color: "#ffffff",
  weight: 1,
  fillOpacity: 0.1,
  fillColor: "transparent",
};

const highlightBorderStyle = { color: "#ffffff", weight: 4 };

function normalizeKey(s) {
  return (s ?? "").toString().trim().toLowerCase();
}
function districtDisplayName(raw) {
  return (raw ?? "").toString().replace(/^район\s+/i, "").trim();
}

function getEcoColor(score) {
  const v = Number(score);
  if (!Number.isFinite(v)) return null;
  if (v >= 8) return "#39f73f";
  if (v >= 6) return "#eaf739";
  if (v >= 4) return "#fca903";
  if (v >= 2) return "#ff5959";
  return "#e74c3c";
}

function getSocialColor(score) {
  const v = Number(score);
  if (!Number.isFinite(v)) return null;
  if (v >= 8) return "#bfe6ff";
  if (v >= 6) return "#caffbf";
  if (v >= 4) return "#fdffb6";
  if (v >= 2) return "#ffd6a5";
  return "#ffadad";
}

function getNoiseColor(score) {
  const v = Number(score);
  if (!Number.isFinite(v)) return null;
  if (v >= 8) return "#39f73f";
  if (v >= 6) return "#eaf739";
  if (v >= 4) return "#fca903";
  if (v >= 2) return "#ff5959";
  return "#e74c3c";
}

function getTotalColor(score) {
  return getEcoColor(score);
}

const SOCIAL_OBJECT_STYLES = {
  education: { color: "#9db7ff", fillColor: "#9db7ff", fillOpacity: 0.35, weight: 1.5 },
  health: { color: "#a7f3d0", fillColor: "#a7f3d0", fillOpacity: 0.35, weight: 1.5 },
  culture: { color: "#fbcfe8", fillColor: "#fbcfe8", fillOpacity: 0.35, weight: 1.5 },
  sport: { color: "#fde68a", fillColor: "#fde68a", fillOpacity: 0.35, weight: 1.5 },
  commerce: { color: "#d8b4fe", fillColor: "#d8b4fe", fillOpacity: 0.35, weight: 1.5 },
};

export default function MapComponent({
  activeLayers = [],
  highLightDistrict,
  activeDistrictName,
  onDistrictClick,
  onError,
}) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const geojsonRef = useRef(null);

  const layersByDistrictRef = useRef(new Map());
  const highlightedLayerRef = useRef(null);

  const nameToSlugRef = useRef(new Map());

  const totalScoreBySlugRef = useRef(new Map());
  const ecoScoreBySlugRef = useRef(new Map());
  const socialScoreBySlugRef = useRef(new Map());
  const noiseScoreBySlugRef = useRef(new Map());

  const districtObjectsLayerRef = useRef(null);

  const onDistrictClickRef = useRef(onDistrictClick);
  const onErrorRef = useRef(onError);
  const activeLayersRef = useRef(activeLayers);

  useEffect(() => {
    onDistrictClickRef.current = onDistrictClick;
    onErrorRef.current = onError;
    activeLayersRef.current = activeLayers;
  }, [onDistrictClick, onError, activeLayers]);

  const recomputeTotalScores = useCallback(() => {
    const totalMap = new Map();
    const allSlugs = new Set([
      ...ecoScoreBySlugRef.current.keys(),
      ...socialScoreBySlugRef.current.keys(),
      ...noiseScoreBySlugRef.current.keys(),
    ]);

    allSlugs.forEach((slug) => {
      const ecoRow = ecoScoreBySlugRef.current.get(slug);
      const socialRow = socialScoreBySlugRef.current.get(slug);
      const noiseRow = noiseScoreBySlugRef.current.get(slug);

      const values = [];
      if (ecoRow && Number.isFinite(Number(ecoRow.ecoScore))) {
        values.push(Number(ecoRow.ecoScore));
      }
      if (socialRow && Number.isFinite(Number(socialRow.socialScore))) {
        values.push(Number(socialRow.socialScore));
      }
      if (noiseRow && Number.isFinite(Number(noiseRow.noiseScore))) {
        values.push(Number(noiseRow.noiseScore));
      }

      const summary10 =
        values.length > 0
          ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
          : null;

      totalMap.set(slug, { slug, summary10 });
    });

    totalScoreBySlugRef.current = totalMap;
  }, []);

  const clearDistrictObjects = useCallback(() => {
    if (districtObjectsLayerRef.current && leafletRef.current) {
      leafletRef.current.removeLayer(districtObjectsLayerRef.current);
      districtObjectsLayerRef.current = null;
    }
  }, []);

  const updateDistrictStyles = useCallback(() => {
    const ecoOn = activeLayersRef.current.includes("eco");
    const socialOn = activeLayersRef.current.includes("social");
    const noiseOn = activeLayersRef.current.includes("noise");

    layersByDistrictRef.current.forEach((layer) => {
      const raw = layer.__districtName || "";
      const display = districtDisplayName(raw);

      let fillColor = "transparent";
      let fillOpacity = 0.0;

      const keyNoPrefix = normalizeKey(display);
      const keyWithPrefix = normalizeKey(`район ${display}`);
      const slug =
        nameToSlugRef.current.get(keyNoPrefix) ||
        nameToSlugRef.current.get(keyWithPrefix);

      if (ecoOn) {
        const row = slug ? ecoScoreBySlugRef.current.get(slug) : null;
        const ecoColor = row ? getEcoColor(row.ecoScore) : null;

        if (ecoColor) {
          fillColor = ecoColor;
          fillOpacity = 0.8;
        } else {
          fillColor = "rgba(45,125,255,0.15)";
          fillOpacity = 0.15;
        }
      } else if (socialOn) {
        const row = slug ? socialScoreBySlugRef.current.get(slug) : null;
        const socialColor = row ? getSocialColor(row.socialScore) : null;

        if (socialColor) {
          fillColor = socialColor;
          fillOpacity = 0.66;
        } else {
          fillColor = "rgba(45,125,255,0.12)";
          fillOpacity = 0.12;
        }
      } else if (noiseOn) {
        const row = slug ? noiseScoreBySlugRef.current.get(slug) : null;
        const noiseColor = row ? getNoiseColor(row.noiseScore) : null;

        if (noiseColor) {
          fillColor = noiseColor;
          fillOpacity = 0.66;
        } else {
          fillColor = "rgba(45,125,255,0.12)";
          fillOpacity = 0.12;
        }
      } else {
        const row = slug ? totalScoreBySlugRef.current.get(slug) : null;
        const totalColor = row ? getTotalColor(row.summary10) : null;

        if (totalColor) {
          fillColor = totalColor;
          fillOpacity = 0.72;
        } else {
          fillColor = "rgba(255,255,255,0.08)";
          fillOpacity = 0.08;
        }
      }

      const base = { ...defaultStyle, fillColor, fillOpacity };
      const isHighlighted = highlightedLayerRef.current === layer;
      layer.setStyle(isHighlighted ? { ...base, ...highlightBorderStyle } : base);
    });
  }, []);

  const applyHighlight = useCallback(
    (districtName) => {
      const raw = (districtName ?? "").toString().trim();
      if (!raw) {
        highlightedLayerRef.current = null;
        updateDistrictStyles();
        return;
      }

      const want = raw.toLowerCase().startsWith("район ") ? raw : `район ${raw}`;
      const key = normalizeKey(want);
      const layer = layersByDistrictRef.current.get(key);

      highlightedLayerRef.current = layer || null;
      updateDistrictStyles();

      if (layer?.openTooltip) layer.openTooltip();
      if (layer && leafletRef.current && layer.getBounds) {
        leafletRef.current.fitBounds(layer.getBounds(), {
          padding: [40, 40],
          maxZoom: 14,
          animate: true,
        });
      }
    },
    [updateDistrictStyles]
  );

  const drawDistrictObjects = useCallback(
    (districtLayer, payload) => {
      if (!leafletRef.current) return;

      clearDistrictObjects();

      const ecoOn = activeLayersRef.current.includes("eco");
      const socialOn = activeLayersRef.current.includes("social");
      const noiseOn = activeLayersRef.current.includes("noise");

      if (!ecoOn && !socialOn && !noiseOn) return;
      if (!districtLayer || !payload) return;

      const bounds = districtLayer.getBounds();
      const group = L.layerGroup();

      const tooltipText = (feature) => {
        const p = feature?.properties || {};

        const address = (p.address || p.Address || "").toString().trim();

        const noiseType = (
          p.noise_category ||
          p["Категория обращения по шуму"] ||
          p.category_name ||
          ""
        )
          .toString()
          .trim();

        if (activeLayersRef.current.includes("noise")) {
          if (noiseType && address) {
            return `Обращение: ${noiseType}\nАдрес: ${address}`;
          }
          if (noiseType) {
            return `Обращение: ${noiseType}`;
          }
          if (address) {
            return `Адрес: ${address}`;
          }
          return "Данные не указаны";
        }

        const name = (p.name || p.Name || "").toString().trim();
        if (name && address) return `${name}\n${address}`;
        return name || address || "Объект";
      };

      const bindObjTooltip = (layer, feature) => {
        const text = tooltipText(feature);
        layer.bindTooltip(text, {
          sticky: true,
          direction: "top",
          opacity: 1,
          className: "obj-tooltip",
        });
      };

      const normalizeFC = (fcLike) => {
        if (!fcLike) return null;
        if (fcLike.type === "FeatureCollection" && Array.isArray(fcLike.features)) return fcLike;
        if (Array.isArray(fcLike)) return { type: "FeatureCollection", features: fcLike };
        if (Array.isArray(fcLike.features)) return { type: "FeatureCollection", features: fcLike.features };
        return null;
      };

      const addGeo = (fcLike, opts = {}) => {
        const fc = normalizeFC(fcLike);
        if (!fc || !Array.isArray(fc.features) || fc.features.length === 0) return;

        const merged = {
          ...opts,
          onEachFeature: (feature, layer) => {
            bindObjTooltip(layer, feature);
            opts.onEachFeature?.(feature, layer);
          },
          pointToLayer: (feature, latlng) => {
            const baseLayer = opts.pointToLayer
              ? opts.pointToLayer(feature, latlng)
              : L.circleMarker(latlng);

            bindObjTooltip(baseLayer, feature);
            return baseLayer;
          },
        };

        group.addLayer(L.geoJSON(fc, merged));
      };

      if (ecoOn) {
        addGeo(payload.objects?.parks, {
          style: { color: "#32cd32", weight: 1.5, fillColor: "#32cd32", fillOpacity: 0.35 },
          filter: (feature) => {
            const g = feature?.geometry;
            if (!g) return false;
            if (g.type === "Point" && Array.isArray(g.coordinates)) {
              const [lng, lat] = g.coordinates;
              return bounds.contains([lat, lng]);
            }
            return true;
          },
          pointToLayer: (_, latlng) =>
            L.circleMarker(latlng, {
              radius: 5,
              color: "#32cd32",
              fillColor: "#32cd32",
              fillOpacity: 0.9,
              weight: 1,
            }),
        });

        addGeo(payload.objects?.forests, {
          style: { color: "#00ff7f", weight: 1, fillColor: "#00ff7f", fillOpacity: 0.25 },
        });

        addGeo(payload.objects?.hazards, {
          filter: (feature) => {
            const g = feature?.geometry;
            if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) return false;
            const [lng, lat] = g.coordinates;
            return bounds.contains([lat, lng]);
          },
          pointToLayer: (_, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: "#ff3333",
              fillColor: "#ff6600",
              fillOpacity: 0.9,
              weight: 1,
            }),
        });
      }

      if (socialOn) {
        const addSocial = (fcLike, styleKey) => {
          const st = SOCIAL_OBJECT_STYLES[styleKey] || {
            color: "#cbd5e1",
            fillColor: "#cbd5e1",
            fillOpacity: 0.35,
            weight: 1.5,
          };

          addGeo(fcLike, {
            filter: (feature) => {
              const g = feature?.geometry;
              if (!g) return false;

              if (g.type === "Point" && Array.isArray(g.coordinates)) {
                const [lng, lat] = g.coordinates;
                return bounds.contains([lat, lng]);
              }
              return true;
            },
            style: st,
            pointToLayer: (_, latlng) =>
              L.circleMarker(latlng, {
                radius: 5,
                color: st.color,
                fillColor: st.fillColor,
                fillOpacity: 0.9,
                weight: 1,
              }),
          });
        };

        addSocial(payload.objects?.education, "education");
        addSocial(payload.objects?.health, "health");
        addSocial(payload.objects?.culture, "culture");
        addSocial(payload.objects?.sport, "sport");
        addSocial(payload.objects?.commerce, "commerce");
      }

      if (noiseOn) {
        addGeo(payload.objects?.measurements, {
          filter: (feature) => {
            const g = feature?.geometry;
            if (!g) return false;

            if (g.type === "Point" && Array.isArray(g.coordinates)) {
              const [lng, lat] = g.coordinates;
              return bounds.contains([lat, lng]);
            }
            return true;
          },
          pointToLayer: (_, latlng) =>
            L.circleMarker(latlng, {
              radius: 5,
              color: "#ff8a3d",
              fillColor: "#ffb36b",
              fillOpacity: 0.9,
              weight: 1,
            }),
        });
      }

      group.addTo(leafletRef.current);
      districtObjectsLayerRef.current = group;
    },
    [clearDistrictObjects]
  );

  useEffect(() => {
    if (leafletRef.current) return;

    let alive = true;
    const controller = new AbortController();

    const map = L.map(mapRef.current, {
      preferCanvas: true,
      renderer: L.canvas(),
      zoomControl: true,
    }).setView([MAP_CONFIGS.INITIAL_LAT, MAP_CONFIGS.INITIAL_LONG], MAP_CONFIGS.INITIAL_ZOOM);

    leafletRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    fetch(DISTRICTS_INDEX_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`districts index HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((d) => {
          if (!d?.name || !d?.slug) return;
          const nm = d.name.toString().trim().toLowerCase();
          m.set(normalizeKey(nm), d.slug);
          m.set(normalizeKey(`район ${nm}`), d.slug);
        });
        nameToSlugRef.current = m;
        updateDistrictStyles();
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        onErrorRef.current?.(e);
      });

    fetch(ECO_SUMMARY_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`eco summary HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (!row?.slug) return;
          m.set(row.slug, row);
        });
        ecoScoreBySlugRef.current = m;
        recomputeTotalScores();
        updateDistrictStyles();
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        onErrorRef.current?.(e);
      });

    fetch(SOCIAL_SUMMARY_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`social summary HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (!row?.slug) return;
          m.set(row.slug, row);
        });
        socialScoreBySlugRef.current = m;
        recomputeTotalScores();
        updateDistrictStyles();
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        onErrorRef.current?.(e);
      });

    fetch(NOISE_SUMMARY_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`noise summary HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (!row?.slug) return;
          m.set(row.slug, row);
        });
        noiseScoreBySlugRef.current = m;
        recomputeTotalScores();
        updateDistrictStyles();
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        onErrorRef.current?.(e);
      });

    fetch(GEOJSON_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Geo districts HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!alive) return;

        if (geojsonRef.current) {
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
              feature?.properties?.name ||
              "Unknown";

            lyr.__districtName = name;
            layersByDistrictRef.current.set(normalizeKey(name), lyr);
            lyr.bindTooltip(name, { sticky: true });

            lyr.on("click", async () => {
              applyHighlight(name);

              const displayName = districtDisplayName(name);
              const formattedName =
                displayName.charAt(0).toUpperCase() + displayName.slice(1);

              const ecoOn = activeLayersRef.current.includes("eco");
              const socialOn = activeLayersRef.current.includes("social");
              const noiseOn = activeLayersRef.current.includes("noise");

              if (!ecoOn && !socialOn && !noiseOn) {
                onDistrictClickRef.current?.(formattedName, null);
                return;
              }

              const keyNoPrefix = normalizeKey(displayName);
              const keyWithPrefix = normalizeKey(`район ${displayName}`);
              const slug =
                nameToSlugRef.current.get(keyNoPrefix) ||
                nameToSlugRef.current.get(keyWithPrefix);

              if (!slug) {
                onDistrictClickRef.current?.(formattedName, null);
                return;
              }

              try {
                const url = ecoOn
                  ? ECO_DISTRICT_URL(slug)
                  : socialOn
                  ? SOCIAL_DISTRICT_URL(slug)
                  : noiseOn
                  ? NOISE_DISTRICT_URL(slug)
                  : null;

                if (!url) {
                  onDistrictClickRef.current?.(formattedName, null);
                  return;
                }

                const resp = await fetch(url, { signal: controller.signal });
                if (!resp.ok) throw new Error(`district layer HTTP ${resp.status}`);
                const payload = await resp.json();

                onDistrictClickRef.current?.(formattedName, payload.stats || null);
                drawDistrictObjects(lyr, payload);
                updateDistrictStyles();

                onErrorRef.current?.(null);
              } catch (e) {
                if (e.name === "AbortError") return;
                onErrorRef.current?.(e);
              }
            });
          },
        }).addTo(map);

        geojsonRef.current = layer;
        updateDistrictStyles();
        onErrorRef.current?.(null);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        onErrorRef.current?.(e);
      });

    return () => {
      alive = false;
      controller.abort();
      try {
        clearDistrictObjects();
        map.remove();
      } catch {}
      leafletRef.current = null;
      geojsonRef.current = null;
    };
  }, [recomputeTotalScores, updateDistrictStyles, clearDistrictObjects, drawDistrictObjects]);

  useEffect(() => {
    if (!leafletRef.current) return;

    const ecoActive = activeLayers.includes("eco");
    const socialActive = activeLayers.includes("social");
    const noiseActive = activeLayers.includes("noise");

    if (!ecoActive && !socialActive && !noiseActive) {
      clearDistrictObjects();
      updateDistrictStyles();
      return;
    }

    updateDistrictStyles();
  }, [activeLayers, updateDistrictStyles, clearDistrictObjects]);

  useEffect(() => {
    if (!highLightDistrict) return;
    applyHighlight(highLightDistrict);
  }, [highLightDistrict, applyHighlight]);

  useEffect(() => {
    if (!leafletRef.current) return;
    const t = setTimeout(() => {
      try {
        leafletRef.current.invalidateSize(true);
      } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [activeDistrictName]);

  const renderLegend = () => {
    const ecoOn = activeLayers.includes("eco");
    const socialOn = activeLayers.includes("social");
    const noiseOn = activeLayers.includes("noise");

    if (!ecoOn && !socialOn && !noiseOn) {
      const totalColorScale = [
        { color: "#e74c3c", label: "1-2 - Критично" },
        { color: "#ff5959", label: "3-4 - Плохо" },
        { color: "#fca903", label: "5-6 - Средне" },
        { color: "#eaf739", label: "7-8 - Хорошо" },
        { color: "#39f73f", label: "9-10 - Отлично" }
      ];

      return (
        <div className={styles.legendContainer}>
          <h4 className={styles.legendTitle}>Шкала общей оценки района</h4>
          <div className={styles.legendItems}>
            {totalColorScale.map((item, index) => (
              <div key={index} className={styles.legendItem}>
                <div className={styles.colorBox} style={{ backgroundColor: item.color }} />
                <span className={styles.legendLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const ecoColorScale = [
      { color: "#e74c3c", label: "1-2 - Критично" },
      { color: "#ff5959", label: "3-4 - Плохо" },
      { color: "#fca903", label: "5-6 - Средне" },
      { color: "#eaf739", label: "7-8 - Хорошо" },
      { color: "#39f73f", label: "9-10 - Отлично" }
    ];

    const socialColorScale = [
      { color: "#ffadad", label: "1-2 - Низкий" },
      { color: "#ffd6a5", label: "3-4 - Ниже среднего" },
      { color: "#fdffb6", label: "5-6 - Средний" },
      { color: "#caffbf", label: "7-8 - Высокий" },
      { color: "#bfe6ff", label: "9-10 - Очень высокий" }
    ];

    const noiseColorScale = [
      { color: "#e74c3c", label: "1-2 - Очень много обращений" },
      { color: "#ff5959", label: "3-4 - Много обращений" },
      { color: "#fca903", label: "5-6 - Умеренное количество" },
      { color: "#eaf739", label: "7-8 - Мало обращений" },
      { color: "#39f73f", label: "9-10 - Очень мало обращений" }
    ];

    const colorScale = ecoOn ? ecoColorScale : socialOn ? socialColorScale : noiseColorScale;
    const title = ecoOn
      ? "Шкала экологической оценки"
      : socialOn
      ? "Шкала социальной оценки"
      : "Шкала шумовых обращений";

    return (
      <div className={styles.legendContainer}>
        <h4 className={styles.legendTitle}>{title}</h4>
        <div className={styles.legendItems}>
          {colorScale.map((item, index) => (
            <div key={index} className={styles.legendItem}>
              <div className={styles.colorBox} style={{ backgroundColor: item.color }} />
              <span className={styles.legendLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <div ref={mapRef} className={styles.map} />
      {renderLegend()}
    </div>
  );
}