import { CATEGORIES, type CategoryId } from "./categories";

export const DURATION_FILTERS = ["short", "medium", "long"] as const;
export type DurationFilter = (typeof DURATION_FILTERS)[number];

export const LANGUAGE_FILTERS = ["es", "en", "both"] as const;
export type LanguageFilter = (typeof LANGUAGE_FILTERS)[number];

export const DATE_FILTERS = ["week", "month", "year"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

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

/** Opciones del filtro de categoría, derivadas de la misma fuente que los chips del home. */
export const CATEGORY_FILTERS: FilterOption<CategoryId>[] = CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
  emoji: category.emoji,
}));

export type AnyFilter = DurationFilter | LanguageFilter | DateFilter | OrderFilter | CategoryId;
