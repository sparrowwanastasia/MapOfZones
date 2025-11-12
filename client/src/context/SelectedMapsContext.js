import { createContext } from "react";

export const SelectedMapsContext = createContext({
  selectedMaps: [],
  setSelectedMaps: () => {
    console.log("setSelectedMaps");
    throw new Error(
      "setSelectedMaps must be used within a SelectedMapsContext.Provider"
    );
  },
});
