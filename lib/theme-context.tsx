import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { AppThemeMode, palettes } from "@/constants/editorial";

const THEME_STORAGE_KEY = "editorial-theme-mode";

type ThemeContextValue = {
  mode: AppThemeMode;
  colors: (typeof palettes)[AppThemeMode];
  isHydrated: boolean;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppThemeMode>("dark");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (!mounted) {
          return;
        }
        if (storedMode === "dark" || storedMode === "light") {
          setMode(storedMode);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => {
      const nextMode: AppThemeMode = currentMode === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
      return nextMode;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colors: palettes[mode],
      isHydrated,
      toggleMode,
    }),
    [isHydrated, mode, toggleMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }
  return context;
}
