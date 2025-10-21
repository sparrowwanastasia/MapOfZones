// client/src/App.jsx
import styles from "./App.module.css";
import { Routes, Navigate, Route } from "react-router-dom"; // импортируем Routes из react-router-dom для маршрутизации, если необходимо. В данном случае он используется просто для структуры кода.

import Admin from "./pages/Admin"; // импортируем компонент Admin
import Compare from "./pages/Compare"; // импортируем компонент Compare
import Main from "./pages/Main"; // импортируем компонент Main

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/" element={<Main />} />
    </Routes>
  );
}

export default App;
