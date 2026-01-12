import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeStyle = "modern" | "classic" | "minimal" | "vibrant" | "dark";

interface ThemeContextType {
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => void;
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
      "--sidebar-background": "220 25% 12%",
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
      "--sidebar-background": "25 30% 15%",
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
      "--sidebar-background": "220 10% 8%",
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
      "--sidebar-background": "262 40% 15%",
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
      "--sidebar-background": "220 30% 6%",
    }
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem("app-theme");
    return (saved as ThemeStyle) || "modern";
  });

  const setTheme = (newTheme: ThemeStyle) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const config = themeConfigs[theme];
    
    // Apply colors
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply dark class for dark theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
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
