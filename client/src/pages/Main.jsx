import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Main.module.css";

const LAYERS = [
  {
    id: "noise",
    title: "шум",
    description:
  "Шумовая оценка района формируется на основе точек мониторинга уровней шума. Для каждого района агрегируются значения измерений, после чего рассчитываются средний и максимальный уровни шума. Итоговый балл приводится к шкале от 0 до 10, где более высокий балл соответствует более тихой и комфортной среде.",
  },
  {
    id: "eco",
    title: "экология",
    description:
      "Экологическая оценка района рассчитывается на основе двух групп факторов: доли зеленых территорий в площади района и техногенной нагрузки. Техногенная нагрузка определяется как комбинация покрытия района зонами влияния опасных объектов и плотности опасных объектов на площадь района. После нормировки показателей итоговый экологический балл формируется как взвешенная сумма зеленого и безопасного компонента.",
  },
  {
    id: "social",
    title: "социальность",
    description:
      "Социальная оценка района рассчитывается на основе пяти групп объектов: образования, здравоохранения, культуры, спорта и коммерции. Для каждой группы определяется количество объектов в пределах района, после чего показатели объединяются во взвешенную сумму и переводятся в итоговый балл по шкале от 0 до 10.",
    groups: [
      {
        key: "education",
        title: "Образование",
        color: "#9db7ff",
        items: ["Образовательные учреждения города Москвы"],
      },
      {
        key: "health",
        title: "Здравоохранение",
        color: "#a7f3d0",
        items: ["Больницы взрослые"],
      },
      {
        key: "culture",
        title: "Культура и досуг",
        color: "#fbcfe8",
        items: ["Театры", "Кинотеатры", "Библиотеки"],
      },
      {
        key: "sport",
        title: "Спорт",
        color: "#fde68a",
        items: ["Спортивные объекты", "Площадки для выгула и дрессировки собак"],
      },
      {
        key: "commerce",
        title: "Коммерция",
        color: "#d8b4fe",
        items: ["Стационарные торговые объекты"],
      },
    ],
  },
  {
    id: "transport",
    title: "транспортная доступность",
    description:
      "Транспортная доступность показывает обеспеченность района элементами транспортной инфраструктуры: станциями метро, остановками общественного транспорта и парковочными местами. Итоговый показатель позволяет оценить удобство повседневных перемещений по городу.",
  },
  {
    id: "crime",
    title: "криминогенная обстановка",
    description:
      "Криминогенный слой отражает плотность потенциально неблагополучных точек и событий в пределах района. Он позволяет учитывать факторы территориальной безопасности при сравнении локаций и формировании итоговой оценки района.",
  },
];

const REASONS = [
  {
    title: "Легко",
    text:
      "Сервис объединяет разрозненные источники информации в единую аналитическую модель. Пользователю не требуется проводить самостоятельный поиск и сопоставление данных в нескольких сервисах — ключевые показатели уже структурированы и визуализированы.",
  },
  {
    title: "Актуально",
    text:
      "Современный рынок недвижимости требует оценки не только квартиры, но и окружающей среды. MapOfZones систематизирует городские данные и позволяет учитывать экологические, инфраструктурные и социальные параметры района при принятии решения о покупке или аренде жилья.",
  },
  {
    title: "Объективно",
    text:
      "Все районы оцениваются по единой методике. Это позволяет сопоставлять альтернативные локации по одинаковым критериям и принимать решения на основе структурированного анализа.",
  },
  {
    title: "Прозрачно",
    text:
      "Итоговая оценка района формируется на основе конкретных измеримых показателей. Пользователь видит не только общий индекс, но и его составляющие, какие факторы повлияли на результат.",
  },
];

const STEPS = [
  { num: "1", text: "открой карту" },
  { num: "2", text: "выбери слой & найди район", wide: true },
  { num: "3", text: "сравни" },
  { num: "4", text: "скачай" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <video
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/data/ВидеоМосква2.mp4" type="video/mp4" />
            Ваш браузер не поддерживает видео.
          </video>
          <div className={styles.heroBgOverlay} />
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <div className={styles.wordmark}>
              <h1 className={styles.wordLine}>MAP</h1>
              <h1 className={styles.wordLine}>OFZONES</h1>
            </div>

            <div className={styles.heroText}>
              <span className={styles.heroTitle}>
                Большой город,
                <br />
                разный характер
                <br />— выбери свой район
              </span>
            </div>

            <div className={styles.heroBottom}>
              <div className={styles.heroSub}>
                Сервис оценки жилой застройки на основе многокритериального анализа
              </div>

              <button
                className={styles.heroCta}
                type="button"
                onClick={() => navigate("/map")}
              >
                Открыть карту
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.whyTitle}>почему MAPOfZONES?</h2>
          <p className={styles.whyText}>
            MapOfZones объединяет разрозненные городские данные в единую систему
            оценки районов. Вместо анализа нескольких источников пользователь получает
            комплексную картину территории в одном сервисе
          </p>

          <div className={styles.reasonGrid}>
            {REASONS.map((item) => (
              <article key={item.title} className={styles.reasonCard}>
                <h3 className={styles.reasonCardTitle}>{item.title}</h3>
                <p className={styles.reasonCardText}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.layersSection}>
        <div className={styles.sectionInner}>
          <div
            className={styles.layersBlock}
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url("/data/ВидеоМосква2.png")',
            }}
          >
            <div className={styles.layersList}>
              {LAYERS.map((layer) => (
                <div key={layer.id} className={styles.layerItem}>
                  <button type="button" className={styles.layerLine}>
                    {layer.title}
                  </button>

                  <div className={styles.layerHoverContent}>
                    <p className={styles.layerDescription}>{layer.description}</p>

                    {layer.id === "social" && layer.groups?.length > 0 && (
                      <div className={styles.socialGroups}>
                        {layer.groups.map((group) => (
                          <div key={group.key} className={styles.socialGroup}>
                            <div className={styles.socialGroupHeader}>
                              <span
                                className={styles.socialGroupSwatch}
                                style={{ backgroundColor: group.color }}
                              />
                              <span className={styles.socialGroupTitle}>{group.title}</span>
                            </div>

                            <div className={styles.socialItems}>
                              {group.items.map((item) => (
                                <div key={item} className={styles.socialItem}>
                                  <span className={styles.socialItemIcon} />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div
                key={step.num}
                className={`${styles.stepCard} ${step.wide ? styles.stepCardWide : ""}`}
              >
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepText}>{step.text}</div>
              </div>
            ))}
          </div>

          <div className={styles.bottomLogo}>
            <span>MAP</span>
            <span>OFZONES</span>
          </div>
        </div>
      </section>
    </main>
  );
}