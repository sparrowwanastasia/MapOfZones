import { createContext, useState } from "react";

export const LayersContext = createContext();

export const LayersProvider = ({ children }) => {
  const [activeLayers, setActiveLayers] = useState({
    eco: false,
    social: false,
    transport: false,
    noise: false,
    crime: false,
    history: false
  });

  const toggleLayer = (key) => {
    setActiveLayers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <LayersContext.Provider value={{ activeLayers, toggleLayer }}>
      {children}
    </LayersContext.Provider>
  );
};
