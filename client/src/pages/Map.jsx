import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import MapComponent from "../components/MapComponent/MapComponent";
import Sidebar from "../components/Sidebar/Sidebar";
import styles from "./Map.module.css";

import {
  DISTRICTS_INDEX_URL,
  ECO_SUMMARY_URL,
  SOCIAL_SUMMARY_URL,
  NOISE_SUMMARY_URL,
} from "../config/constants/constants";

import { SelectedMapsContext } from "../context/SelectedMapsContext";

const LAYERS = [
  { id: "eco", label: "Экология" },
  { id: "social", label: "Социальный" },
  { id: "transport", label: "Транспорт" },
  { id: "noise", label: "Шум" },
  { id: "crime", label: "Криминогенный" },
  { id: "history", label: "История" },
];

function normalizeKey(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function titleCaseRu(s) {
  const str = (s ?? "").toString().trim();
  if (!str) return "";
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function calcTotal(scores) {
  const values = [
    num(scores?.eco),
    num(scores?.social),
    num(scores?.transport),
    num(scores?.noise),
    num(scores?.crime),
    num(scores?.history),
  ].filter((v) => v != null);

  if (!values.length) return null;

  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

export default function MapPage() {
  const ctx = useContext(SelectedMapsContext) || {};
  const selectedMaps = Array.isArray(ctx.selectedMaps) ? ctx.selectedMaps : [];
  const setSelectedMaps = typeof ctx.setSelectedMaps === "function" ? ctx.setSelectedMaps : null;

  const [activeLayer, setActiveLayer] = useState(null);

  const [activeDistrictName, setActiveDistrictName] = useState(null);
  const [activeDistrictStats, setActiveDistrictStats] = useState(null);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [nameToSlug, setNameToSlug] = useState(new Map());
  const [searchValue, setSearchValue] = useState("");
  const [searchTarget, setSearchTarget] = useState(null);

  const [ecoBySlug, setEcoBySlug] = useState(new Map());
  const [socialBySlug, setSocialBySlug] = useState(new Map());
  const [noiseBySlug, setNoiseBySlug] = useState(new Map());

  const activeLayers = useMemo(() => (activeLayer ? [activeLayer] : []), [activeLayer]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    fetch(DISTRICTS_INDEX_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`districts index HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!alive) return;

        const opts = (rows || [])
          .filter((d) => d?.name && d?.slug)
          .map((d) => ({
            name: titleCaseRu(d.name),
            slug: d.slug,
            rawName: d.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ru"));

        const m = new Map();
        opts.forEach((d) => {
          const nm = normalizeKey(d.rawName);
          m.set(nm, d.slug);
          m.set(normalizeKey(`район ${nm}`), d.slug);
        });

        setDistrictOptions(opts);
        setNameToSlug(m);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        console.log(e);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    fetch(ECO_SUMMARY_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (row?.slug) m.set(row.slug, row);
        });
        setEcoBySlug(m);
      })
      .catch(() => {});

    fetch(SOCIAL_SUMMARY_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (row?.slug) m.set(row.slug, row);
        });
        setSocialBySlug(m);
      })
      .catch(() => {});

    fetch(NOISE_SUMMARY_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!alive) return;
        const m = new Map();
        (rows || []).forEach((row) => {
          if (row?.slug) m.set(row.slug, row);
        });
        setNoiseBySlug(m);
      })
      .catch(() => {});

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const handleLayerClick = useCallback((id) => {
    setActiveLayer((prev) => (prev === id ? null : id));
  }, []);

  const handleDistrictClick = useCallback((districtName, statsOrNull) => {
    setActiveDistrictName(districtName);
    setActiveDistrictStats(statsOrNull);
    setSearchTarget(districtName);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setActiveDistrictName(null);
    setActiveDistrictStats(null);
  }, []);

  const activeSlug = useMemo(() => {
    if (!activeDistrictName) return null;
    const nm = normalizeKey(activeDistrictName.replace(/^район\s+/i, ""));
    return nameToSlug.get(nm) || nameToSlug.get(normalizeKey(`район ${nm}`)) || null;
  }, [activeDistrictName, nameToSlug]);

  const isInCompare = useMemo(() => {
    if (!activeSlug) return false;

    if (typeof ctx.hasDistrict === "function") return !!ctx.hasDistrict(activeSlug);

    return selectedMaps.some((d) => d?.slug === activeSlug);
  }, [activeSlug, ctx, selectedMaps]);

  const handleAddToCompare = useCallback(() => {
    if (!activeSlug || !activeDistrictName) return;

    const ecoRow = ecoBySlug.get(activeSlug) || {};
    const socialRow = socialBySlug.get(activeSlug) || {};
    const noiseRow = noiseBySlug.get(activeSlug) || {};

    const currentScores = {
      eco: num(ecoRow.ecoScore),
      social: num(socialRow.socialScore),
      transport: null,
      noise: num(noiseRow.noiseScore),
      crime: null,
      history: null,
    };

    const currentDetails = {
      eco: {
        ecoScore:
          activeLayer === "eco"
            ? activeDistrictStats?.ecoScore ?? num(ecoRow.ecoScore)
            : num(ecoRow.ecoScore),
        greenIndex:
          activeLayer === "eco"
            ? activeDistrictStats?.greenIndex ?? num(ecoRow.greenIndex)
            : num(ecoRow.greenIndex),
        hazardIndex:
          activeLayer === "eco"
            ? activeDistrictStats?.hazardIndex ?? num(ecoRow.hazardIndex)
            : num(ecoRow.hazardIndex),
        parks:
          activeLayer === "eco"
            ? activeDistrictStats?.parks ?? ecoRow.parks ?? null
            : ecoRow.parks ?? null,
        forests:
          activeLayer === "eco"
            ? activeDistrictStats?.forests ?? ecoRow.forests ?? null
            : ecoRow.forests ?? null,
        hazardsCount:
          activeLayer === "eco"
            ? activeDistrictStats?.hazardsCount ?? ecoRow.hazardsCount ?? null
            : ecoRow.hazardsCount ?? null,
      },

      social: {
        socialScore:
          activeLayer === "social"
            ? activeDistrictStats?.socialScore ?? num(socialRow.socialScore)
            : num(socialRow.socialScore),
        education:
          activeLayer === "social"
            ? activeDistrictStats?.education ?? socialRow.education ?? null
            : socialRow.education ?? null,
        health:
          activeLayer === "social"
            ? activeDistrictStats?.health ?? socialRow.health ?? null
            : socialRow.health ?? null,
        culture:
          activeLayer === "social"
            ? activeDistrictStats?.culture ?? socialRow.culture ?? null
            : socialRow.culture ?? null,
        sport:
          activeLayer === "social"
            ? activeDistrictStats?.sport ?? socialRow.sport ?? null
            : socialRow.sport ?? null,
        commerce:
          activeLayer === "social"
            ? activeDistrictStats?.commerce ?? socialRow.commerce ?? null
            : socialRow.commerce ?? null,
      },

      noise: {
        noiseScore:
          activeLayer === "noise"
            ? activeDistrictStats?.noiseScore ?? num(noiseRow.noiseScore)
            : num(noiseRow.noiseScore),
        totalComplaints:
          activeLayer === "noise"
            ? activeDistrictStats?.totalComplaints ?? noiseRow.totalComplaints ?? null
            : noiseRow.totalComplaints ?? null,
        categories:
          activeLayer === "noise"
            ? activeDistrictStats?.categories ?? []
            : [],
      },
    };

    const district = {
      slug: activeSlug,
      name: activeDistrictName,
      scores: currentScores,
      totalScore: calcTotal(currentScores),
      details: currentDetails,
      updatedAt: new Date().toISOString(),
    };

    if (selectedMaps.length >= 4 && !selectedMaps.some((d) => d?.slug === activeSlug)) {
      alert("Можно добавить не более 4 районов для сравнения.");
      return;
    }

    if (typeof ctx.upsertDistrict === "function") {
      const existing = selectedMaps.find((d) => d?.slug === activeSlug);
      const merged = existing
        ? {
            ...existing,
            ...district,
            scores: { ...(existing.scores || {}), ...(district.scores || {}) },
            details: {
              ...(existing.details || {}),
              ...(district.details || {}),
              eco: { ...(existing.details?.eco || {}), ...(district.details?.eco || {}) },
              social: { ...(existing.details?.social || {}), ...(district.details?.social || {}) },
              noise: { ...(existing.details?.noise || {}), ...(district.details?.noise || {}) },
            },
            totalScore: calcTotal({ ...(existing.scores || {}), ...(district.scores || {}) }),
          }
        : district;

      ctx.upsertDistrict(merged);
      return;
    }

    if (typeof setSelectedMaps !== "function") return;

    setSelectedMaps((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const idx = arr.findIndex((d) => d?.slug === district.slug);

      if (idx === -1) {
        if (arr.length >= 4) return arr;
        return [...arr, district];
      }

      const existing = arr[idx];
      const mergedScores = { ...(existing?.scores || {}), ...(district?.scores || {}) };
      const mergedDetails = {
        ...(existing?.details || {}),
        ...(district?.details || {}),
        eco: { ...(existing?.details?.eco || {}), ...(district?.details?.eco || {}) },
        social: { ...(existing?.details?.social || {}), ...(district?.details?.social || {}) },
        noise: { ...(existing?.details?.noise || {}), ...(district?.details?.noise || {}) },
      };

      const updated = {
        ...existing,
        ...district,
        scores: mergedScores,
        details: mergedDetails,
        totalScore: calcTotal(mergedScores),
      };

      const copy = [...arr];
      copy[idx] = updated;
      return copy;
    });
  }, [
    activeSlug,
    activeDistrictName,
    ecoBySlug,
    socialBySlug,
    noiseBySlug,
    activeLayer,
    activeDistrictStats,
    ctx,
    setSelectedMaps,
    selectedMaps,
  ]);

  const submitSearch = useCallback(
    (e) => {
      e?.preventDefault?.();
      const v = (searchValue || "").trim();
      if (!v) return;
      setSearchTarget(v);
    },
    [searchValue]
  );

  return (
    <div className={styles.page}>
      <div className={styles.mapWrap}>
        <form className={styles.searchBar} onSubmit={submitSearch}>
          <input
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Поиск района…"
            list="districts-list"
            aria-label="Поиск района"
          />
          <datalist id="districts-list">
            {districtOptions.map((d) => (
              <option key={d.slug} value={d.name} />
            ))}
          </datalist>

          <button className={styles.searchBtn} type="submit">
            Найти
          </button>
        </form>

        <MapComponent
          activeLayers={activeLayers}
          activeDistrictName={activeDistrictName}
          highLightDistrict={activeDistrictName || searchTarget}
          onDistrictClick={handleDistrictClick}
          onError={() => {}}
        />

        <div className={styles.layerBar}>
          {LAYERS.map((l) => {
            const isOn = activeLayer === l.id;
            return (
              <button
                key={l.id}
                className={`${styles.layerBtn} ${isOn ? styles.layerBtnActive : ""}`}
                onClick={() => handleLayerClick(l.id)}
                type="button"
              >
                {l.label}
              </button>
            );
          })}
        </div>

        <Sidebar
          isOpen={!!activeDistrictName}
          districtName={activeDistrictName}
          activeLayer={activeLayer}
          stats={activeDistrictStats}
          onClose={handleCloseSidebar}
          isInCompare={isInCompare}
          onAddToCompare={handleAddToCompare}
        />
      </div>
    </div>
  );
}