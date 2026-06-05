import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Sidebar.module.css";

function row(label, value) {
  return (
    <div className={styles.row}>
      <div className={styles.key}>{label}</div>
      <div className={styles.val}>{value ?? "—"}</div>
    </div>
  );
}

function legendRow(label, color, value) {
  return (
    <div className={styles.row}>
      <div className={styles.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 4,
            background: color,
            border: "1px solid rgba(0,0,0,0.15)",
            flex: "0 0 auto",
          }}
        />
        <span>{label}</span>
      </div>
      <div className={styles.val}>{value ?? "—"}</div>
    </div>
  );
}

function isMobileScreen() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

export default function Sidebar({
  isOpen,
  districtName,
  activeLayer,
  stats,
  onClose,
  onAddToCompare,
  isInCompare,
}) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isOpen && isMobileScreen()) {
      setIsCollapsed(true);
    }

    if (isOpen && !isMobileScreen()) {
      setIsCollapsed(false);
    }
  }, [isOpen, districtName, activeLayer]);

  if (!isOpen) return null;

  const layerTitle =
    activeLayer === "eco"
      ? "Экологическая оценка района"
      : activeLayer === "social"
      ? "Социальная оценка района"
      : activeLayer === "noise"
      ? "Оценка по шумовым обращениям"
      : "Оценка района";

  const handleCompareClick = () => {
    if (isInCompare) {
      navigate("/compare");
      return;
    }

    onAddToCompare?.();
  };

  const handleClose = () => {
    setIsCollapsed(false);
    onClose?.();
  };

  const noiseCategories = Array.isArray(stats?.categories)
    ? stats.categories.filter((item) => Number(item?.count) > 0)
    : [];

  return (
    <aside
      className={`${styles.sidebar} ${
        isCollapsed ? styles.sidebarCollapsed : ""
      }`}
    >
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>{districtName}</div>
          <div className={styles.sub}>{layerTitle}</div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.mobileToggle}
            onClick={() => setIsCollapsed((prev) => !prev)}
            type="button"
          >
            {isCollapsed ? "Показать" : "Свернуть"}
          </button>

          <button
            className={styles.closeBtn}
            onClick={handleClose}
            type="button"
            aria-label="close"
          >
            ×
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeLayer === "eco" ? (
          <>
            {row("Экологический балл", stats?.ecoScore)}
            {row("Индекс зелени", stats?.greenIndex)}
            {row("Индекс техногенной нагрузки", stats?.hazardIndex)}
            <div className={styles.divider} />
            {row("Парков", stats?.parks)}
            {row("Опасных объектов", stats?.hazardsCount)}
          </>
        ) : activeLayer === "social" ? (
          <>
            {row("Социальный балл", stats?.socialScore)}
            <div className={styles.divider} />

            <div className={styles.muted} style={{ marginBottom: 8 }}>
              Категории
            </div>

            {legendRow("Образование", "#9db7ff", stats?.education)}
            {legendRow("Здоровье", "#a7f3d0", stats?.health)}
            {legendRow("Культура и досуг", "#fbcfe8", stats?.culture)}
            {legendRow("Спорт", "#fde68a", stats?.sport)}
            {legendRow("Коммерция", "#d8b4fe", stats?.commerce)}
          </>
        ) : activeLayer === "noise" ? (
          <>
            {row("Шумовой балл", stats?.noiseScore)}
            {row("Всего обращений", stats?.totalComplaints)}
            <div className={styles.divider} />

            {noiseCategories.length > 0 ? (
              <>
                <div className={styles.muted} style={{ marginBottom: 8 }}>
                  Типы обращений в районе
                </div>

                {noiseCategories.map((item) => (
                  <div key={item.name} className={styles.row}>
                    <div className={styles.key}>{item.name}</div>
                    <div className={styles.val}>{item.count}</div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.muted}>
                По этому району обращений не найдено.
              </div>
            )}
          </>
        ) : (
          <div className={styles.muted}>
            Для этого слоя статистика пока не подключена.
          </div>
        )}

        <button
          className={styles.compareBtn}
          type="button"
          onClick={handleCompareClick}
        >
          {isInCompare ? "Перейти к сравнению" : "Добавить в сравнение"}
        </button>
      </div>
    </aside>
  );
}