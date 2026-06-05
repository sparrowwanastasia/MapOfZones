import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import styles from "./App.module.css";

import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";

import Main from "./pages/Main";
import MapPage from "./pages/Map";
import Compare from "./pages/Compare";
import Admin from "./pages/Admin";
import Legend from "./pages/Legend";

import PracticePage from "./practice/PracticePage";

import { SelectedMapsContext } from "./context/SelectedMapsContext";

function App() {
  const [selectedMaps, setSelectedMaps] = useState([]);
  const location = useLocation();

  const isMapPage = location.pathname === "/map";

  return (
    <SelectedMapsContext.Provider value={{ selectedMaps, setSelectedMaps }}>
      <div className={styles.app}>
        <Header />

        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/legend" element={<Legend />} />
          <Route path="/practice" element={<PracticePage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {!isMapPage && <Footer />}
      </div>
    </SelectedMapsContext.Provider>
  );
}

export default App;