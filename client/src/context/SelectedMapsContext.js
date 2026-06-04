import React, { createContext, useEffect, useMemo, useState } from "react";

export const SelectedMapsContext = createContext({
  selectedMaps: [],
  setSelectedMaps: () => {},
  hasDistrict: () => false,
  upsertDistrict: () => {},
  removeDistrict: () => {},
  clearAll: () => {},
});

const STORAGE_KEY = "mapofzones:selectedMaps:v1";

export function SelectedMapsProvider({ children }) {
  const [selectedMaps, setSelectedMaps] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMaps));
    } catch {}
  }, [selectedMaps]);

  const api = useMemo(() => {
    const hasDistrict = (slug) => {
      if (!slug) return false;
      return selectedMaps.some((d) => d?.slug === slug);
    };

    const upsertDistrict = (district) => {
      if (!district?.slug) return;

      setSelectedMaps((prev) => {
        const idx = prev.findIndex((d) => d?.slug === district.slug);
        if (idx === -1) return [...prev, district];

        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...district,
          scores: { ...(copy[idx]?.scores || {}), ...(district?.scores || {}) },
        };
        return copy;
      });
    };

    const removeDistrict = (slug) => {
      setSelectedMaps((prev) => prev.filter((d) => d?.slug !== slug));
    };

    const clearAll = () => setSelectedMaps([]);

    return {
      selectedMaps,
      setSelectedMaps, // ✅ оставляем, чтобы твой старый Compare не сломался
      hasDistrict,
      upsertDistrict,
      removeDistrict,
      clearAll,
    };
  }, [selectedMaps]);

  return (
    <SelectedMapsContext.Provider value={api}>
      {children}
    </SelectedMapsContext.Provider>
  );
}
