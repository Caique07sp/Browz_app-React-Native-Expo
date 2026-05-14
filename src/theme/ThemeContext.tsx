import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { darkTheme, lightTheme } from "./themes";

type ThemeType = typeof darkTheme;

type ThemeContextType = {
  theme: ThemeType;
  darkMode: boolean;
  toggleTheme: (value: boolean) => void;
};

const ThemeContext = createContext({} as ThemeContextType);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    const savedTheme = await AsyncStorage.getItem("@theme");

    if (savedTheme === "light") {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }

  async function toggleTheme(value: boolean) {
    setDarkMode(value);

    await AsyncStorage.setItem(
      "@theme",
      value ? "dark" : "light"
    );
  }

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        darkMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}