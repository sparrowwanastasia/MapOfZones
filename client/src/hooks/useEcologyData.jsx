// src/hooks/useEcologyData.jsx
import { useMosGeoDataset } from "./useMosGeoDataset";

// 64036 — "Дворовые территории"
export function useEcologyData(active) {
  const { data, error, loading } = useMosGeoDataset(64036, active);
  return { data, error, loading };
}
