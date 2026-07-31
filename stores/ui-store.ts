"use client";

import { create } from "zustand";
import { THEME_STORAGE_KEY } from "@/constants/site";

export type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
  toast: null,
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}));

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage no disponible (modo privado, etc.)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
