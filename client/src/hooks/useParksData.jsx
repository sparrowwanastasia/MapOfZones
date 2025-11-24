// src/hooks/useParksData.jsx
import { useMosGeoDataset } from "./useMosGeoDataset";

// 1465 — "Парки"
export function useParksData(active) {
  const { data, error, loading } = useMosGeoDataset(1465, active);
  return { data, error, loading };
}
