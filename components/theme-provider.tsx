"use client";

import { useEffect } from "react";
import { readStoredTheme, useUIStore } from "@/stores/ui-store";
import { THEME_STORAGE_KEY } from "@/constants/site";

/**
 * Aplica el tema al <html> y lo persiste. El script inline del layout evita
 * el flash de tema incorrecto antes de la hidratación.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = (theme: "light" | "dark") =>
      document.documentElement.classList.toggle("dark", theme === "dark");

    const initial = readStoredTheme();
    useUIStore.setState({ theme: initial });
    apply(initial);

    const unsubscribe = useUIStore.subscribe((state, previous) => {
      if (state.theme === previous.theme) return;
      apply(state.theme);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      } catch {
        // localStorage no disponible
      }
    });

    return unsubscribe;
  }, []);

  return children;
}
