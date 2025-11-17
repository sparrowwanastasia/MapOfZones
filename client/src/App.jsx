import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import styles from "./App.module.css";
import { LayersProvider } from "./context/LayersContext";


import Header from "./components/Header/Header";
import Main from "./pages/Main";
import MapPage from "./pages/Map";
import Compare from "./pages/Compare";
import Admin from "./pages/Admin";

import { SelectedMapsContext } from "./context/SelectedMapsContext";

function App() {
  const [selectedMaps, setSelectedMaps] = useState([]);

  useEffect(() => {
    setSelectedMaps([
      {
        id: 1,
        name: "Карта test",
        description: "Описание карты 1",
        image: "https://via.placeholder.com/150",
      },
    ]);
  }, []);

  return (
    <SelectedMapsContext.Provider value={{ selectedMaps, setSelectedMaps }}>
      <div className={styles.app}>
        <Header />
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/admin" element={<Admin />} />
          {/* всё остальное перенаправляем на главную */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </SelectedMapsContext.Provider>
  );
}

export default App;
