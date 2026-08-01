import { CATEGORIES, type CategoryId } from "./categories";

export const DURATION_FILTERS = ["short", "medium", "long"] as const;
export type DurationFilter = (typeof DURATION_FILTERS)[number];

export const LANGUAGE_FILTERS = ["es", "en", "both"] as const;
export type LanguageFilter = (typeof LANGUAGE_FILTERS)[number];

export const DATE_FILTERS = ["week", "month", "year"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

/** Tipo de contenido: la API no distingue shorts, se filtran post-captura;
 *  los en vivo se piden con eventType=live en la propia llamada. */
export const VIDEO_TYPE_FILTERS = ["all", "video", "short", "live"] as const;
export type VideoTypeFilter = (typeof VIDEO_TYPE_FILTERS)[number];

/** Modo de consumo: condiciona qué tan denso/informativo es el contenido. */
export const CONSUMPTION_FILTERS = ["focused", "background"] as const;
export type ConsumptionFilter = (typeof CONSUMPTION_FILTERS)[number];

/** Límites del rango de duración personalizada (minutos). */
export const DURATION_RANGE_LIMITS = { min: 1, max: 240 } as const;

/** Los valores de orden que expone la UI; el API usa relevance | viewCount | date. */
export const ORDER_FILTERS = ["relevance", "views", "newest"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

export const DURATION_OPTIONS: FilterOption<DurationFilter>[] = [
  { value: "short", label: "Corto (< 4 min)" },
  { value: "medium", label: "Medio (4–20 min)" },
  { value: "long", label: "Largo (> 20 min)" },
];

export const LANGUAGE_OPTIONS: FilterOption<LanguageFilter>[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "both", label: "Ambos" },
];

export const DATE_OPTIONS: FilterOption<DateFilter>[] = [
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mes" },
  { value: "year", label: "Último año" },
];

export const ORDER_OPTIONS: FilterOption<OrderFilter>[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "views", label: "Más vistos" },
  { value: "newest", label: "Más recientes" },
];

export const VIDEO_TYPE_OPTIONS: FilterOption<VideoTypeFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "video", label: "Videos" },
  { value: "short", label: "Shorts" },
  { value: "live", label: "En vivo" },
];

export const CONSUMPTION_OPTIONS: FilterOption<ConsumptionFilter>[] = [
  { value: "focused", label: "Prestando atención completa" },
  { value: "background", label: "De fondo, mientras hago otra cosa" },
];

/** Opciones del filtro de categoría, derivadas de la misma fuente que los chips del home. */
export const CATEGORY_FILTERS: FilterOption<CategoryId>[] = CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
  emoji: category.emoji,
}));

export type AnyFilter =
  | DurationFilter
  | LanguageFilter
  | DateFilter
  | OrderFilter
  | CategoryId
  | VideoTypeFilter
  | ConsumptionFilter;
