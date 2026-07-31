"use client";

import { useCallback, useEffect, useState } from "react";
import { FAVORITES_STORAGE_KEY } from "@/constants/site";
import type { Video } from "@/types/video";

type FavoritesMap = Record<string, Video>;

let cache: FavoritesMap | null = null;
const listeners = new Set<() => void>();

function read(): FavoritesMap {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "{}") as FavoritesMap;
  } catch {
    cache = {};
  }
  return cache;
}

function write(map: FavoritesMap) {
  cache = map;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage no disponible
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Favoritos del usuario guardados en localStorage (Fase 0: sin backend).
 * Hook compartido por la tarjeta de video y la página /favorites.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesMap>(read);

  useEffect(() => {
    const sync = () => setFavorites(read());
    const unsubscribe = subscribe(sync);
    sync();
    return unsubscribe;
  }, []);

  const toggleFavorite = useCallback((video: Video) => {
    const next = { ...read() };
    if (next[video.id]) {
      delete next[video.id];
    } else {
      next[video.id] = video;
    }
    write(next);
  }, []);

  const clearFavorites = useCallback(() => write({}), []);

  const isFavorite = useCallback((id: string) => id in favorites, [favorites]);

  return {
    favorites,
    toggleFavorite,
    clearFavorites,
    isFavorite,
  };
}
