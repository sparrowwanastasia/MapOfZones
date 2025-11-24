// src/hooks/useHazardData.js
import { useEffect, useState } from "react";

// Файл лежит прямо в public/
const HAZARD_GEOJSON_URL = "/data/hazards.geojson";

export function useHazardData(active) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return;

    setError(null);

    fetch(HAZARD_GEOJSON_URL)
      .then((res) => {
        console.log("Hazards fetch status:", res.status);
        if (!res.ok) {
          throw new Error(
            `Не удалось загрузить hazards.geojson (status ${res.status})`
          );
        }
        return res.json();
      })
      .then((json) => {
        console.log("Hazards loaded, features:", json.features?.length);
        setData(json);
      })
      .catch((e) => {
        console.error("Ошибка загрузки опасных объектов:", e);
        setError("Не удалось загрузить данные об опасных объектах");
      });
  }, [active]);

  return { data, error };
}
