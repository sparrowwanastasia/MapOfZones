import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import styles from './App.module.css';

import Header from './components/Header/Header';
import Main from './pages/Main';
import MapPage from './pages/Map';
import Compare from './pages/Compare';
import Admin from './pages/Admin';

function App() {
  return (
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
  );
}

export default App;
