// client/src/App.jsx
import React from "react";
import MapComponent from "./components/MapComponent/MapComponent"; // наш компонент
import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.App}>
      <MapComponent /> {/* 👈 теперь рендерится карта */}
    </div>
  );
}

export default App;
