import type { CategoryId } from "@/constants/categories";

/** Cómo quiere consumir el contenido el usuario (clave para "mientras como/trabajo"). */
export type ConsumptionMode = "focused" | "background";

/** A quién va dirigido el contenido; controla la exclusión infantil. */
export type AudienceMode = "general" | "family" | "any";

export type Mood = "relaxing" | "energetic" | "informative" | "funny";

/**
 * Intención resuelta por la capa semántica (services/intent-ai.ts).
 *
 * Es el contrato que la Fase 2 consolida: el modelo interpreta la frase del
 * usuario y devuelve una intención estructurada que el repository traduce a
 * una búsqueda de YouTube. Si la capa de IA no está disponible, el motor de
 * reglas produce los mismos campos a partir de `SearchFilters`.
 */
export interface ResolvedIntent {
  /** Query optimizada para YouTube, en lenguaje natural de búsqueda. */
  searchQuery: string;
  /** Términos a excluir de los resultados (p.ej. ["niños", "kids", "para bebés"]). */
  excludeTerms: string[];
  category: CategoryId | null;
  durationBucket: "short" | "medium" | "long" | null;
  consumptionMode: ConsumptionMode;
  /** Por defecto excluir contenido infantil salvo que se pida. */
  audience: AudienceMode;
  mood: Mood | null;
  language: "es" | "en" | "both";
}
