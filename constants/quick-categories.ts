import type { CategoryId } from "./categories";

export interface QuickCategory {
  emoji: string;
  label: string;
  /** Atajo por categoría (los chips del home). */
  category?: CategoryId;
  /** Atajo por texto libre en lenguaje natural. */
  query?: string;
}

export const QUICK_CATEGORIES: QuickCategory[] = [
  { emoji: "🍔", label: "Comer", category: "comida" },
  { emoji: "😂", label: "Humor", category: "humor" },
  { emoji: "📚", label: "Aprender", query: "aprende algo nuevo" },
  { emoji: "👻", label: "Terror", category: "terror" },
  { emoji: "🎮", label: "Gaming", category: "gaming" },
  { emoji: "💻", label: "Programación", category: "programacion" },
  { emoji: "🎧", label: "Podcasts", category: "podcasts" },
  { emoji: "🌌", label: "Ciencia", category: "ciencia" },
  { emoji: "⚽", label: "Deportes", category: "deportes" },
  { emoji: "🎵", label: "Música", category: "musica" },
];

/** Ejemplos para validar la hipótesis del producto: intención en lenguaje natural. */
export const EXAMPLE_QUERIES = [
  "quiero algo para comer",
  "un podcast interesante",
  "algo divertido",
  "aprender React",
  "historias de terror de madrugada",
];
