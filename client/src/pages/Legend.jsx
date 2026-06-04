import React from "react";
import Header from "../components/Header/Header";

function Formula({ children }) {
  return (
    <div
      style={{
        background: "#f6f7f9",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px 16px",
        margin: "12px 0",
        fontFamily: "monospace",
        fontSize: "15px",
        overflowX: "auto",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        marginTop: "32px",
        marginBottom: "12px",
        fontSize: "22px",
      }}
    >
      {children}
    </h2>
  );
}

function Legend() {
  return (
    <div>
      <Header />
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
        <h1 style={{ marginBottom: "16px" }}>
          Справка по экологическим слоям и индексам
        </h1>

        <section style={{ marginBottom: "24px" }}>
          <p style={{ lineHeight: 1.7 }}>
            Ниже приведена логика расчета экологической оценки района в сервисе.
            Экологическая оценка строится из двух частей: зеленые территории и
            опасные объекты.
          </p>
        </section>

        <SectionTitle>1. Общая логика расчета</SectionTitle>
        <p style={{ lineHeight: 1.7 }}>
          Экологическая оценка строится из двух частей:
        </p>
        <p style={{ lineHeight: 1.7 }}>
          <b>1) Зелень</b> — насколько район покрыт парками и лесами.
        </p>
        <p style={{ lineHeight: 1.7 }}>
          <b>2) Опасности</b> — насколько район попадает в зоны влияния опасных
          объектов и сколько опасных объектов там вообще есть.
        </p>

        <SectionTitle>2. Что берется из данных</SectionTitle>
        <p style={{ lineHeight: 1.7 }}>
          <b>Из GeoJSON районов:</b> геометрия района.
        </p>
        <p style={{ lineHeight: 1.7 }}>
          <b>Из таблицы Object:</b> парки, леса, опасные объекты.
        </p>

        <SectionTitle>3. Что считается для каждого района</SectionTitle>

        <h3 style={{ marginTop: "20px" }}>Шаг 1. Считается green_ratio</h3>
        <Formula>
          green_ratio = площадь парков и лесов внутри района / площадь района
        </Formula>
        <p style={{ lineHeight: 1.7 }}>
          Это означает: если зелени много, то <b>green_ratio</b> выше; если
          зелени мало — ниже.
        </p>

        <h3 style={{ marginTop: "20px" }}>
          Шаг 2. Считается hazard_overlap_ratio
        </h3>
        <Formula>
          hazard_overlap = площадь района, попавшая в буферы опасных объектов /
          площадь района
        </Formula>
        <p style={{ lineHeight: 1.7 }}>
          Для каждого опасного объекта строится буфер радиусом 1000 м. Затем
          определяется, какая часть района попала в эти зоны. Если зона влияния
          покрывает большой участок района, показатель становится выше.
        </p>

        <h3 style={{ marginTop: "20px" }}>
          Шаг 3. Считается hazard_count_density
        </h3>
        <Formula>
          hazard_count_density = количество опасных объектов / площадь района
        </Formula>
        <p style={{ lineHeight: 1.7 }}>
          Это плотность опасных объектов. Она нужна для того, чтобы учитывать не
          только количество, но и размер района.
        </p>

        <SectionTitle>4. Что такое нормировка</SectionTitle>
        <p style={{ lineHeight: 1.7 }}>
          После вычисления сырых значений:
        </p>
        <ul style={{ lineHeight: 1.7 }}>
          <li>green_ratio</li>
          <li>hazard_overlap</li>
          <li>hazard_count_density</li>
        </ul>
        <p style={{ lineHeight: 1.7 }}>
          сервис сравнивает их по всем районам и приводит к шкале от 0 до 1.
        </p>
        <Formula>x_norm = (x - min) / (max - min)</Formula>
        <p style={{ lineHeight: 1.7 }}>
          <b>0</b> — худшее значение среди всех районов, <b>1</b> — лучшее.
        </p>
        <p style={{ lineHeight: 1.7 }}>
          Нормировка нужна для того, чтобы можно было складывать разные
          показатели между собой, так как у них изначально разный масштаб.
        </p>

        <SectionTitle>5. Как считается зеленый индекс</SectionTitle>
        <Formula>green_index = 10 × green_norm</Formula>
        <p style={{ lineHeight: 1.7 }}>
          После нормировки зеленый показатель переводится в шкалу от 0 до 10.
        </p>

        <SectionTitle>6. Как считается штраф опасности</SectionTitle>
        <p style={{ lineHeight: 1.7 }}>
          Сначала берутся два нормированных показателя:
        </p>
        <ul style={{ lineHeight: 1.7 }}>
          <li>hazard_overlap_norm</li>
          <li>hazard_count_norm</li>
        </ul>
        <p style={{ lineHeight: 1.7 }}>
          Затем они объединяются в общий штраф:
        </p>
        <Formula>
          hazard_penalty = 0.7 × hazard_overlap_norm + 0.3 × hazard_count_norm
        </Formula>
        <p style={{ lineHeight: 1.7 }}>
          Это означает, что опасность района зависит:
        </p>
        <ul style={{ lineHeight: 1.7 }}>
          <li>на 70% — от покрытия района зонами влияния опасных объектов</li>
          <li>на 30% — от плотности опасных объектов</li>
        </ul>

        <SectionTitle>7. Как считается hazard_index</SectionTitle>
        <Formula>hazard_index = 10 × hazard_penalty</Formula>
        <p style={{ lineHeight: 1.7 }}>
          Чем выше этот показатель, тем район опаснее.
        </p>

        <SectionTitle>8. Как считается hazard_safe_index</SectionTitle>
        <Formula>hazard_safe_index = 10 - hazard_index</Formula>
        <p style={{ lineHeight: 1.7 }}>
          Это обратный показатель:
        </p>
        <ul style={{ lineHeight: 1.7 }}>
          <li>если опасность высокая — безопасность низкая</li>
          <li>если опасность низкая — безопасность высокая</li>
        </ul>

        <SectionTitle>9. Как считается итоговый eco_score</SectionTitle>
        <Formula>
          eco_score = 10 × (0.6 × green_norm + 0.4 × (1 - hazard_penalty))
        </Formula>
        <p style={{ lineHeight: 1.7 }}>
          Итоговая экологическая оценка:
        </p>
        <ul style={{ lineHeight: 1.7 }}>
          <li>на 60% зависит от зелени</li>
          <li>на 40% зависит от того, насколько район безопасен</li>
        </ul>

        <SectionTitle>10. Что означают веса</SectionTitle>
        <ul style={{ lineHeight: 1.7 }}>
          <li>
            <b>GREEN_WEIGHT = 0.6</b> — зелень важнее
          </li>
          <li>
            <b>HAZARD_WEIGHT = 0.4</b> — опасности тоже важны, но чуть меньше
          </li>
          <li>
            <b>HAZARD_OVERLAP_WEIGHT = 0.7</b> — важнее, насколько район
            реально попадает в зоны влияния
          </li>
          <li>
            <b>HAZARD_COUNT_WEIGHT = 0.3</b> — количество опасных объектов тоже
            учитывается, но слабее
          </li>
        </ul>

        <SectionTitle>11. Что делает радиус 1000 м</SectionTitle>
        <Formula>DEFAULT_HAZARD_RADIUS_M = 1000.0</Formula>
        <p style={{ lineHeight: 1.7 }}>
          Это значит, что вокруг каждого опасного объекта строится зона влияния
          радиусом 1000 метров. Это нужно для того, чтобы объект влиял не только
          в том случае, если он расположен внутри района, но и на соседние
          территории рядом с ним.
        </p>



        <section style={{ marginTop: "48px" }}>
  <h1 style={{ marginBottom: "16px" }}>
    Справка по социальному слою и индексам
  </h1>

  <p style={{ lineHeight: 1.7 }}>
    Ниже приведена логика расчета социальной оценки района в сервисе.
    Социальная оценка показывает, насколько район обеспечен
    повседневной и социальной инфраструктурой.
  </p>

  <SectionTitle>1. Общая логика расчета</SectionTitle>
  <p style={{ lineHeight: 1.7 }}>
    Социальная оценка строится из пяти групп объектов:
  </p>
  <ul style={{ lineHeight: 1.7 }}>
    <li><b>Образование</b></li>
    <li><b>Здравоохранение</b></li>
    <li><b>Культура</b></li>
    <li><b>Спорт</b></li>
    <li><b>Коммерция</b></li>
  </ul>
  <p style={{ lineHeight: 1.7 }}>
    При расчете учитывается не только количество объектов, но и размер района.
    Поэтому используется не абсолютное число объектов, а их плотность на площадь района.
  </p>

  <SectionTitle>2. Что берется из данных</SectionTitle>
  <p style={{ lineHeight: 1.7 }}>
    <b>Из GeoJSON районов:</b> геометрия района.
  </p>
  <p style={{ lineHeight: 1.7 }}>
    <b>Из таблицы Object:</b> объекты категорий education, health,
    culture, sport и commerce.
  </p>

  <SectionTitle>3. Что считается для каждого района</SectionTitle>

  <h3 style={{ marginTop: "20px" }}>Шаг 1. Считается площадь района</h3>
  <Formula>district_area = area(district)</Formula>
  <p style={{ lineHeight: 1.7 }}>
    Площадь района нужна для того, чтобы учитывать размер территории.
  </p>

  <h3 style={{ marginTop: "20px" }}>
    Шаг 2. Считается количество объектов по категориям
  </h3>
  <p style={{ lineHeight: 1.7 }}>
    Для каждого района определяется число объектов категорий:
    education, health, culture, sport, commerce.
  </p>

  <h3 style={{ marginTop: "20px" }}>
    Шаг 3. Считается плотность объектов каждой категории
  </h3>
  <Formula>density = count / district_area</Formula>
  <p style={{ lineHeight: 1.7 }}>
    Для каждой категории вычисляется плотность объектов на площадь района.
    Это позволяет сравнивать между собой районы разного размера.
  </p>

  <h3 style={{ marginTop: "20px" }}>
    Шаг 4. Считается raw-социальный показатель
  </h3>
  <Formula>
    social_raw = 2.0 × education_density + 2.0 × health_density + 1.0 × culture_density + 1.0 × sport_density + 0.5 × commerce_density
  </Formula>
  <p style={{ lineHeight: 1.7 }}>
    Это взвешенная сумма плотностей объектов по категориям.
  </p>

  <SectionTitle>4. Что означают веса</SectionTitle>
  <ul style={{ lineHeight: 1.7 }}>
    <li><b>education = 2.0</b> — высокий приоритет</li>
    <li><b>health = 2.0</b> — высокий приоритет</li>
    <li><b>culture = 1.0</b> — средний вклад</li>
    <li><b>sport = 1.0</b> — средний вклад</li>
    <li><b>commerce = 0.5</b> — меньший вклад</li>
  </ul>
  <p style={{ lineHeight: 1.7 }}>
    Более высокие веса у образования и здравоохранения, так как они являются
    базовыми элементами городской среды. Культура и спорт также учитываются,
    но слабее. Коммерция влияет на итоговый балл меньше остальных категорий.
  </p>

  <SectionTitle>5. Что такое нормировка</SectionTitle>
  <p style={{ lineHeight: 1.7 }}>
    После вычисления значения <b>social_raw</b> по всем районам
    показатель приводится к шкале от 0 до 1.
  </p>
  <Formula>x_norm = (x - min) / (max - min)</Formula>
  <p style={{ lineHeight: 1.7 }}>
    <b>0</b> означает худшее значение среди всех районов, <b>1</b> — лучшее.
    Нормировка нужна для того, чтобы итоговые оценки районов были сопоставимыми.
  </p>

  <SectionTitle>6. Как считается итоговый social_score</SectionTitle>
  <Formula>social_score = 10 × social_norm</Formula>
  <p style={{ lineHeight: 1.7 }}>
    После нормировки показатель переводится в шкалу от 0 до 10.
  </p>

  <SectionTitle>7. Что это значит простыми словами</SectionTitle>
  <p style={{ lineHeight: 1.7 }}>
    Если в районе много школ, поликлиник, культурных, спортивных и коммерческих
    объектов относительно его площади, социальная оценка будет выше.
    Если район большой, но инфраструктуры в нем недостаточно,
    итоговый social_score будет ниже.
  </p>
</section>

      </main>
    </div>
  );
}

export default Legend;