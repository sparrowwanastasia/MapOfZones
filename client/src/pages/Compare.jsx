import React, { useContext, useMemo, useState } from "react";
import styles from "./Compare.module.css";
import { SelectedMapsContext } from "../context/SelectedMapsContext";

function num(v) {
  if (v === null || v === undefined || v === "") return null;

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
  ].filter((v) => v !== null);

  if (!values.length) return null;

  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

function formatValue(v) {
  const n = num(v);
  return n === null ? "—" : n.toFixed(1);
}

function formatCount(v) {
  const n = num(v);
  return n === null ? "—" : String(Math.round(n));
}

function getSegmentColor(index) {
  if (index <= 1) return "#e74c3c";
  if (index <= 3) return "#ff5959";
  if (index <= 5) return "#fca903";
  if (index <= 7) return "#eaf739";
  return "#39f73f";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function TotalScale({ value }) {
  const safe = value === null || value === undefined ? 0 : Math.max(0, Math.min(10, value));
  const activeCount = Math.round(safe);

  return (
    <div className={styles.scaleBlock}>
      <div className={styles.scaleRow}>
        {Array.from({ length: 10 }).map((_, index) => {
          const isActive = index < activeCount;

          return (
            <div
              key={index}
              className={styles.scaleSegment}
              style={{
                backgroundColor: isActive
                  ? getSegmentColor(index)
                  : "rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>

      <div className={styles.scaleFooter}>
        <span className={styles.scaleText}>1</span>
        <span className={styles.scaleValue}>{formatValue(value)} / 10</span>
        <span className={styles.scaleText}>10</span>
      </div>
    </div>
  );
}

function LayerRow({ label, value }) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{formatValue(value)}</span>
    </div>
  );
}

function DistrictCard({ district, total, isRecommended, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>{district?.name || "Район"}</h3>
          <p className={styles.cardSub}>Общая оценка района</p>
        </div>

        <button
          className={styles.moreBtn}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? "Скрыть" : "Подробнее"}
        </button>
      </div>

      {isRecommended && <div className={styles.recommendation}>Рекомендация</div>}

      <TotalScale value={total} />

      <div className={styles.cardActions}>
        <button
          className={styles.removeBtn}
          type="button"
          onClick={() => onRemove(district.slug)}
        >
          Убрать
        </button>
      </div>

      {isOpen && (
        <div className={styles.details}>
          <div className={styles.detailBlock}>
            <div className={styles.detailTitle}>Общая оценка</div>
            <div className={styles.detailMain}>{formatValue(total)} / 10</div>
          </div>

          <div className={styles.detailBlock}>
            <div className={styles.detailTitle}>Оценки по слоям</div>

            <div className={styles.metricList}>
              <LayerRow label="Экология" value={district?.scores?.eco} />
              <LayerRow label="Социальный" value={district?.scores?.social} />
              <LayerRow label="Транспорт" value={district?.scores?.transport} />
              <LayerRow label="Шум" value={district?.scores?.noise} />
              <LayerRow label="Криминогенный" value={district?.scores?.crime} />
              <LayerRow label="История" value={district?.scores?.history} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyCard() {
  return (
    <article className={`${styles.card} ${styles.emptyCard}`}>
      <div className={styles.emptyCardTitle}>Список пуст</div>
      <div className={styles.emptyCardText}>
        Пока в сравнение ничего не добавлено. Выберите район на карте.
      </div>
    </article>
  );
}

function getReportRows(district, total) {
  const scores = district?.scores || {};
  const eco = district?.details?.eco || {};
  const social = district?.details?.social || {};
  const noise = district?.details?.noise || {};

  return [
    ["Общая оценка района", formatValue(total)],

    ["Экологический балл", formatValue(eco.ecoScore ?? scores.eco)],
    ["Индекс зелени", formatValue(eco.greenIndex)],
    ["Индекс техногенной нагрузки", formatValue(eco.hazardIndex)],
    ["Парков", formatCount(eco.parks)],
    ["Лесных территорий", formatCount(eco.forests)],
    ["Опасных объектов", formatCount(eco.hazardsCount)],

    ["Социальный балл", formatValue(social.socialScore ?? scores.social)],
    ["Образовательных объектов", formatCount(social.education)],
    ["Объектов здравоохранения", formatCount(social.health)],
    ["Объектов культуры и досуга", formatCount(social.culture)],
    ["Спортивных объектов", formatCount(social.sport)],
    ["Коммерческих объектов", formatCount(social.commerce)],

    ["Шумовой балл", formatValue(noise.noiseScore ?? scores.noise)],
    ["Обращений по шуму", formatCount(noise.totalComplaints)],
  ];
}

function buildPrintableReportHtml(districts) {
  const createdAt = new Date().toLocaleString("ru-RU");

  const districtTables = districts
    .map((district, index) => {
      const total = district?.total ?? calcTotal(district?.scores);
      const rows = getReportRows(district, total);

      return `
        <section class="district-block">
          <div class="district-head">
            <div>
              <h2>${escapeHtml(district?.name || "Район")}</h2>
              <div class="district-meta">Карточка ${index + 1}</div>
            </div>
            <div class="district-total">Общая оценка: ${escapeHtml(formatValue(total))} / 10</div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th>Показатель</th>
                <th>Значение</th>
                <th>Отметка</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  ([label, value]) => `
                    <tr>
                      <td>${escapeHtml(label)}</td>
                      <td>${escapeHtml(value)}</td>
                      <td class="check-cell">☐</td>
                      <td></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <div class="notes-title">Заметки по району</div>
          <table class="notes-table">
            <tr><td></td></tr>
            <tr><td></td></tr>
            <tr><td></td></tr>
            <tr><td></td></tr>
          </table>
        </section>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Отчет по сравнению районов</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 14mm 18mm 14mm;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            background: #fff;
          }

          .page {
            max-width: 100%;
          }

          h1 {
            margin: 0 0 10px;
            font-size: 24px;
          }

          .top-meta {
            margin-bottom: 20px;
            color: #444;
            font-size: 13px;
          }

          .district-block {
            margin-bottom: 28px;
            page-break-inside: avoid;
          }

          .district-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 10px;
          }

          .district-head h2 {
            margin: 0 0 4px;
            font-size: 18px;
          }

          .district-meta {
            font-size: 12px;
            color: #555;
          }

          .district-total {
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          .report-table th,
          .report-table td,
          .notes-table td {
            border: 1px solid #555;
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: middle;
          }

          .report-table th {
            background: #f3f3f3;
            text-align: left;
          }

          .report-table td:nth-child(2),
          .report-table td:nth-child(3) {
            text-align: center;
            width: 90px;
          }

          .report-table td:nth-child(4) {
            width: 220px;
          }

          .check-cell {
            font-size: 16px;
          }

          .notes-title {
            margin: 12px 0 6px;
            font-size: 13px;
            font-weight: 700;
          }

          .notes-table td {
            height: 28px;
          }
        </style>
      </head>

      <body>
        <div class="page">
          <h1>Отчет по сравнению районов</h1>
          <div class="top-meta">Дата формирования: ${escapeHtml(createdAt)}</div>
          ${districtTables}
        </div>
      </body>
    </html>
  `;
}

export default function Compare() {
  const ctx = useContext(SelectedMapsContext) || {};
  const selectedMaps = Array.isArray(ctx.selectedMaps) ? ctx.selectedMaps.slice(0, 4) : [];
  const setSelectedMaps =
    typeof ctx.setSelectedMaps === "function" ? ctx.setSelectedMaps : null;

  const [isSorted, setIsSorted] = useState(false);

  const removeDistrict = (slug) => {
    if (typeof ctx.removeDistrict === "function") {
      ctx.removeDistrict(slug);
      return;
    }

    if (typeof setSelectedMaps !== "function") return;

    setSelectedMaps((prev) =>
      (Array.isArray(prev) ? prev : []).filter((d) => d?.slug !== slug)
    );
  };

  const districtsWithTotal = useMemo(() => {
    return selectedMaps.map((district) => ({
      ...district,
      total: calcTotal(district?.scores),
    }));
  }, [selectedMaps]);

  const shownDistricts = useMemo(() => {
    const arr = [...districtsWithTotal];

    if (isSorted) {
      arr.sort((a, b) => {
        const va = a.total === null ? -1 : a.total;
        const vb = b.total === null ? -1 : b.total;
        return vb - va;
      });
    }

    return arr;
  }, [districtsWithTotal, isSorted]);

  const emptySlots = Math.max(0, 4 - shownDistricts.length);

  const handleDownloadReport = () => {
    if (shownDistricts.length === 0) return;

    const html = buildPrintableReportHtml(shownDistricts);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "report-compare-districts.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.h2}>Сравнение районов</h2>
            <p className={styles.sub}>
              Максимум 4 района. Общая оценка рассчитывается по доступным слоям.
            </p>
          </div>

          <div className={styles.headButtons}>
            <button
              className={styles.compareBtn}
              type="button"
              onClick={() => setIsSorted(true)}
              disabled={shownDistricts.length === 0}
            >
              Сравнить
            </button>

            <button
              className={styles.downloadBtn}
              type="button"
              onClick={handleDownloadReport}
              disabled={shownDistricts.length === 0}
            >
              Скачать отчет
            </button>
          </div>
        </div>



        <div className={styles.grid}>
          {shownDistricts.map((district, index) => (
            <DistrictCard
              key={district?.slug ?? district?.name}
              district={district}
              total={district.total}
              isRecommended={isSorted && index === 0 && district.total !== null}
              onRemove={removeDistrict}
            />
          ))}

          {Array.from({ length: emptySlots }).map((_, index) => (
            <EmptyCard key={`empty-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}