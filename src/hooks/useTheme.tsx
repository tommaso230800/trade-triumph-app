import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeStyle = "modern" | "classic" | "minimal" | "vibrant" | "dark";

/**
 * Design dell'interfaccia, indipendente dal tema colore:
 * - "classico": l'aspetto storico dell'app (predefinito su ogni dispositivo)
 * - "pannelli": grafite scura a pannelli, accento blu, sidebar staccata,
 *   card morbide. Ha una palette propria, quindi il tema colore non si applica.
 */
export type DesignStyle = "classico" | "pannelli";

export const designConfigs: Record<DesignStyle, { name: string; description: string }> = {
  classico: { name: "Classico", description: "L'aspetto di sempre, chiaro" },
  pannelli: { name: "Pannelli scuri", description: "Scuro a pannelli, angoli morbidi, accento blu" },
};

interface ThemeContextType {
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => void;
  design: DesignStyle;
  setDesign: (design: DesignStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themeConfigs: Record<ThemeStyle, { name: string; description: string; colors: Record<string, string> }> = {
  modern: {
    name: "Moderno",
    description: "Design pulito con accenti blu",
    colors: {
      "--primary": "217 91% 50%",
      "--accent": "152 69% 45%",
      "--background": "210 20% 98%",
      "--card": "0 0% 100%",
    }
  },
  classic: {
    name: "Classico",
    description: "Elegante con toni caldi",
    colors: {
      "--primary": "25 95% 53%",
      "--accent": "38 92% 50%",
      "--background": "30 15% 97%",
      "--card": "30 20% 99%",
    }
  },
  minimal: {
    name: "Minimal",
    description: "Bianco e nero essenziale",
    colors: {
      "--primary": "220 10% 25%",
      "--accent": "220 10% 40%",
      "--background": "0 0% 100%",
      "--card": "220 10% 98%",
    }
  },
  vibrant: {
    name: "Vibrante",
    description: "Colori vivaci e energici",
    colors: {
      "--primary": "262 83% 58%",
      "--accent": "330 81% 60%",
      "--background": "270 30% 98%",
      "--card": "270 40% 100%",
    }
  },
  dark: {
    name: "Scuro",
    description: "Tema scuro per gli occhi",
    colors: {
      "--primary": "217 91% 60%",
      "--accent": "152 69% 50%",
      "--background": "220 25% 8%",
      "--card": "220 25% 12%",
    }
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem("app-theme");
    return saved && saved in themeConfigs ? (saved as ThemeStyle) : "modern";
  });

  const [design, setDesignState] = useState<DesignStyle>(() => {
    const saved = localStorage.getItem("app-design");
    return saved === "pannelli" ? "pannelli" : "classico";
  });

  const setDesign = (newDesign: DesignStyle) => {
    setDesignState(newDesign);
    localStorage.setItem("app-design", newDesign);
  };

  const setTheme = (newTheme: ThemeStyle) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const config = themeConfigs[theme];
    // Sidebar colors are paired in global CSS; discard the legacy one-color override.
    root.style.removeProperty("--sidebar-background");
    
    const panel = design === "pannelli";
    root.classList.toggle("design-panel", panel);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", panel ? "#121419" : "#f2f5fa");

    // Apply colors (non con "Pannelli scuri", che ha la sua palette)
    Object.entries(config.colors).forEach(([key, value]) => {
      if (panel) root.style.removeProperty(key);
      else root.style.setProperty(key, value);
    });

    // Apply dark class for dark theme
    if (theme === "dark" || panel) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, design]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, design, setDesign }}>
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

/** Vero quando l'interfaccia è scura (tema Scuro o design Pannelli scuri). */
export function useIsDarkUI() {
  const { theme, design } = useTheme();
  return design === "pannelli" || theme === "dark";
}
