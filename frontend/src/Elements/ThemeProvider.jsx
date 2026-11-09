/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

const readSaved = () => {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
};

const ThemeProvider = ({ children }) => {
  // Light (cream) is the main look; dark mode is remembered once chosen.
  const [IsDark, setIsDark] = useState(readSaved);

  useEffect(() => {
    // On <html> so the page background and toasts switch too.
    document.documentElement.classList.toggle("dark", IsDark);
    try {
      localStorage.setItem("theme", IsDark ? "dark" : "light");
    } catch {
      /* storage blocked: theme just won't be remembered */
    }
  }, [IsDark]);

  return <ThemeContext.Provider value={{ IsDark, setIsDark }}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
