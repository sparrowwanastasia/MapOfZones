export const API_BASE =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8002";

export const GEOJSON_URL = `${API_BASE}/api/geo/districts/`;
export const DISTRICTS_INDEX_URL = `${API_BASE}/api/districts/`;

// Общая итоговая оценка района (по умолчанию для окраски карты)
export const TOTAL_SUMMARY_URL = `${API_BASE}/api/rating/summary/`;

export const ECO_SUMMARY_URL = `${API_BASE}/api/eco/summary/`;
export const ECO_DISTRICT_URL = (slug) =>
  `${API_BASE}/api/eco/district/${encodeURIComponent(slug)}/`;

export const SOCIAL_SUMMARY_URL = `${API_BASE}/api/social/summary/`;
export const SOCIAL_DISTRICT_URL = (slug) =>
  `${API_BASE}/api/social/district/${encodeURIComponent(slug)}/`;

export const NOISE_SUMMARY_URL = `${API_BASE}/api/noise/summary/`;
export const NOISE_DISTRICT_URL = (slug) =>
  `${API_BASE}/api/noise/district/${encodeURIComponent(slug)}/`;

export const MAP_CONFIGS = {
  INITIAL_LAT: 55.751244,
  INITIAL_LONG: 37.618423,
  INITIAL_ZOOM: 10,
};