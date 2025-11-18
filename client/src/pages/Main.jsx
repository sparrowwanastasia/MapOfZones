import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Main.module.css';

const Main = () => {
  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1>Оценка районов Москвы</h1>
          <p>Карта, слои оценки (экология, транспорт, шум и др.) и сравнение районов.</p>
          <div className={styles.actions}>
            <Link to="/map" className={styles.btn}>Открыть карту</Link>
            <Link to="/compare" className={styles.link}>Сравнить районы</Link>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className={styles.analytics}>
        <div className={styles.container}>
          <h2>Аналитика районов Москвы</h2>
          <p>Исследуйте ключевые показатели районов Москвы в реальном времени</p>
        </div>
      </section>

      {/* Why MapOfZones Section */}
      <section className={styles.why}>
        <div className={styles.container}>
          <h2>Почему MapOfZones?</h2>
          <p>MapOfZones — это не просто еще одно приложение. Это инструмент для удовлетворения ваших потребностей в данных о городе.</p>
          <div className={styles.whyCards}>
            <div className={styles.card}>
              <div className={styles.cardIcon}></div>
              <h3>Признание и самовыражение</h3>
              <p>Интроверты часто не получают достаточного признания своих внутренних переживаний. Отмечая свои чувства на карте, вы говорите миру: «Я был здесь и это чувствовал» — без необходимости социального взаимодействия.</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}></div>
              <h3>Чувство принадлежности</h3>
              <p>Видя данные других людей на карте, вы чувствуете свою связь с городом и его жителями. MapOfZones создаёт уникальное ощущение принадлежности к общему пространству информации, даже если вы предпочитаете не вступать в прямой контакт.</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}></div>
              <h3>Формирование идентичности</h3>
              <p>Важная цель для людей, которые формируют свое представление о мире. Анализ данных помогает лучше понять себя и построить более четкую картину вашего района.</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}></div>
              <h3>Анализ и рефлексия</h3>
              <p>В современном мире с постоянным потоком информации MapOfZones создаёт пространство для анализа данных. Это помогает лучше понимать тенденции и принимать обоснованные решения.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2>Возможности платформы</h2>
          <p>Исследуйте пространственный ландшафт города с помощью уникальных инструментов MapOfZones</p>
          <div className={styles.featureCards}>
            <div className={styles.featureCard}>
              <h3>Тепловая карта данных</h3>
              <p>Просматривайте интерактивную тепловую карту, визуализирующую различные показатели районов города в реальном времени.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
            <div className={styles.featureCard}>
              <h3>Пользовательские отметки</h3>
              <p>Добавляйте свои данные на карту, помогая создавать актуальную картину города.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
            <div className={styles.featureCard}>
              <h3>Персональная аналитика</h3>
              <p>Получайте инсайты о районе, отслеживайте динамику изменений показателей и выявляйте закономерности.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
            <div className={styles.featureCard}>
              <h3>Социальные возможности</h3>
              <p>Создавайте сообщества, сравнивайте районы и совместно исследуйте данные о городе.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
            <div className={styles.featureCard}>
              <h3>Серии данных</h3>
              <p>Ведите серии данных, получайте достижения и рекомендации на основе динамики показателей районов.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
            <div className={styles.featureCard}>
              <h3>История данных</h3>
              <p>Просматривайте историю данных районов, фильтруйте их по параметрам и датам, анализируйте изменения во времени.</p>
              <button className={styles.featureButton}>Узнать больше</button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Steps) Section */}
      <section className={styles.steps}>
        <div className={styles.container}>
          <h2>Как это работает</h2>
          <div className={styles.stepList}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Регистрация</h3>
              <p>Создайте аккаунт, чтобы получить доступ ко всем функциям и начать добавлять данные на карту.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Выбор района</h3>
              <p>Выберите район Москвы, который вы хотите исследовать.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Добавление данных</h3>
              <p>Отметьте на карте район и добавьте соответствующие данные или комментарии.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Анализ данных</h3>
              <p>Получайте отчеты о данных районов, анализируйте их и делитесь результатами.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <h2>Начните исследовать карту города</h2>
          <p>Присоединяйтесь к сообществу MapOfZones и откройте для себя новый способ анализа данных городских районов</p>
          <Link to="/map" className={styles.btn}>Открыть карту</Link>
        </div>
      </section>
    </>
  );
};

export default Main;
