// src/hooks/useMosGeoDataset.jsx
import { useState, useEffect } from "react";

const API_BASE = "https://apidata.mos.ru/v1";
const API_KEY = "57e7712f-ddc6-4e7a-9242-6f1a37b7af47";
const PAGE_SIZE = 1000; // сколько объектов тянем за один запрос

// Пытаемся достать общее количество записей
function extractCount(json) {
  if (typeof json === "number") return json;
  if (json && typeof json === "object") {
    if (typeof json.Count === "number") return json.Count;
    if (typeof json.ItemsCount === "number") return json.ItemsCount;
  }
  return NaN;
}

/**
 * Универсальный хук: вытаскивает ВСЕ geo-объекты набора Mos.ru.
 *
 * @param {number|string} datasetId - id набора (например, 64036 или 1465)
 * @param {boolean} active          - если false, запросы не выполняются
 *
 * @returns {{ data: Object|null, error: Error|null, loading: boolean }}
 *          data — GeoJSON FeatureCollection
 */
export function useMosGeoDataset(datasetId, active) {
  const [data, setData] = useState(null);   // FeatureCollection
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !datasetId) return;

    const abortController = new AbortController();
    let cancelled = false;

    const loadAll = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(null);

        // 1. Узнаём, сколько всего записей
        const countRes = await fetch(
          `${API_BASE}/datasets/${datasetId}/count?api_key=${API_KEY}`,
          { signal: abortController.signal }
        );

        if (!countRes.ok) {
          throw new Error(`Count HTTP ${countRes.status}`);
        }

        const countJson = await countRes.json();
        const total = extractCount(countJson);
        console.log(`Dataset ${datasetId}: total count =`, total);

        const allFeatures = [];
        let skip = 0;

        // 2. Пагинация по features
        // в URL используются параметры $top и $skip (OData-style)
        while (true) {
          const url =
            `${API_BASE}/datasets/${datasetId}/features` +
            `?api_key=${API_KEY}&$top=${PAGE_SIZE}&$skip=${skip}`;

          const res = await fetch(url, { signal: abortController.signal });
          if (!res.ok) {
            throw new Error(`Features HTTP ${res.status}`);
          }

          const pageJson = await res.json();

          let pageFeatures = [];
          if (
            pageJson &&
            pageJson.type === "FeatureCollection" &&
            Array.isArray(pageJson.features)
          ) {
            pageFeatures = pageJson.features;
          } else if (Array.isArray(pageJson)) {
            pageFeatures = pageJson;
          } else {
            console.warn(
              "Неожиданный формат ответа features для набора",
              datasetId,
              pageJson
            );
          }

          if (!pageFeatures.length) break;

          allFeatures.push(...pageFeatures);
          skip += pageFeatures.length;
          console.log(
            `Dataset ${datasetId}: loaded ${skip} / ${total || "?"} features`
          );

          // если знаем total и уже всё забрали — выходим
          if (Number.isFinite(total) && skip >= total) break;

          // защита от бесконечного цикла
          if (skip > 100000) break;
        }

        if (cancelled) return;

        const featureCollection = {
          type: "FeatureCollection",
          features: allFeatures,
        };

        setData(featureCollection);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Ошибка загрузки набора Mos.ru:", e);
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [active, datasetId]);

  return { data, error, loading };
}
