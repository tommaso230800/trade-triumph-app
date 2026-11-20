import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeStyle = "modern" | "classic" | "minimal" | "vibrant" | "dark";

interface ThemeContextType {
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Due aspetti reali: Scuro (predefinito) e Chiaro. Le altre chiavi restano per
 * compatibilità con le preferenze già salvate sui dispositivi e ricadono sullo
 * Scuro; `hidden` le toglie dalla scelta in Impostazioni. `colors` serve solo
 * per l'anteprima: la palette vera è nei token di index.css (:root / .light).
 */
export const themeConfigs: Record<ThemeStyle, { name: string; description: string; mode: "dark" | "light"; hidden?: boolean; colors: Record<string, string> }> = {
  modern: {
    name: "Scuro",
    description: "Grafite con accento blu, riposante e leggibile",
    mode: "dark",
    colors: {
      "--primary": "217 91% 60%",
      "--accent": "220 14% 12%",
      "--background": "220 16% 8%",
    }
  },
  minimal: {
    name: "Chiaro",
    description: "Sfondo chiaro, utile in pieno sole",
    mode: "light",
    colors: {
      "--primary": "221 83% 53%",
      "--accent": "0 0% 100%",
      "--background": "210 33% 96%",
    }
  },
  classic: { name: "Scuro", description: "", mode: "dark", hidden: true, colors: {} },
  vibrant: { name: "Scuro", description: "", mode: "dark", hidden: true, colors: {} },
  dark: { name: "Scuro", description: "", mode: "dark", hidden: true, colors: {} },
};

export const isDarkTheme = (theme: ThemeStyle) => themeConfigs[theme].mode === "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem("app-theme");
    return saved && saved in themeConfigs ? (saved as ThemeStyle) : "modern";
  });

  const setTheme = (newTheme: ThemeStyle) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Le versioni precedenti scrivevano i colori inline: si ripuliscono così
    // comandano solo i token di index.css.
    ["--sidebar-background", "--primary", "--accent", "--background", "--card"].forEach((k) => root.style.removeProperty(k));
    const dark = isDarkTheme(theme);
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121419" : "#f2f5fa");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
