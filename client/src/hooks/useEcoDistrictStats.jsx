// src/hooks/useEcoDistrictStats.jsx
import { useMosGeoDataset } from "./useMosGeoDataset";
import { useMemo } from "react";

// Нормализуем название района к виду "район люблино"
const normalizeDistrictKey = (name) => {
  if (!name) return "";
  let nm = name.toString().trim().toLowerCase();
  if (!nm) return "";
  if (!nm.startsWith("район ")) {
    nm = "район " + nm;
  }
  return nm;
};

export function useEcoDistrictStats(active) {
  // 64036 — дворовые территории
  const {
    data: yardsData,
    error: yardsError,
    loading: yardsLoading,
  } = useMosGeoDataset(64036, active);

  // 1465 — парки
  const {
    data: parksData,
    error: parksError,
    loading: parksLoading,
  } = useMosGeoDataset(1465, active);

  const statsByDistrict = useMemo(() => {
    const stats = {}; // { normalizedDistrict: { yards, parks } }

    const addCount = (features, type) => {
      if (!features) return;
      features.forEach((feature) => {
        const props = feature.properties || {};
        const attrs = props.Attributes || props;

        // пробуем вытащить название района из разных полей
        const rawDistrict =
          attrs.District ||
          attrs.DistrictName ||
          attrs.Districts ||
          attrs.DistrictTitle ||
          attrs.District_name;

        const key = normalizeDistrictKey(rawDistrict);
        if (!key) return;

        if (!stats[key]) {
          stats[key] = { yards: 0, parks: 0 };
        }
        stats[key][type] += 1;
      });
    };

    if (yardsData && Array.isArray(yardsData.features)) {
      addCount(yardsData.features, "yards");
    }
    if (parksData && Array.isArray(parksData.features)) {
      addCount(parksData.features, "parks");
    }

    return stats;
  }, [yardsData, parksData]);

  return {
    statsByDistrict,
    loading: yardsLoading || parksLoading,
    error: yardsError || parksError,
  };
}
