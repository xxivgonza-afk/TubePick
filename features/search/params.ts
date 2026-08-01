import { z, type ZodType } from "zod";
import { CATEGORY_IDS, type CategoryId } from "@/constants/categories";
import {
  DATE_FILTERS,
  DURATION_FILTERS,
  LANGUAGE_FILTERS,
  ORDER_FILTERS,
  VIDEO_TYPE_FILTERS,
} from "@/constants/filters";
import type { SearchFilters } from "@/types/search";

/**
 * Esquema Zod de los query params de la URL. Única fuente de verdad de la
 * forma canónica:
 * /search?q=...&category=...&duration=...&language=...&date=...&order=...&videoType=...
 *
 * Cada campo se parsea de forma independiente: un valor inválido se descarta
 * en silencio sin tumbar el resto de la URL (la URL es solo estado, nunca
 * una fuente de errores).
 */
const qSchema = z.preprocess(firstParam, z.string().trim().max(200)).optional();
const categorySchema = z.preprocess(firstParam, z.enum(CATEGORY_IDS)).optional();
const durationSchema = z.preprocess(firstParam, z.enum(DURATION_FILTERS)).optional();
const languageSchema = z.preprocess(firstParam, z.enum(LANGUAGE_FILTERS)).optional();
const dateSchema = z.preprocess(firstParam, z.enum(DATE_FILTERS)).optional();
const orderSchema = z.preprocess(firstParam, z.enum(ORDER_FILTERS)).optional();
const videoTypeSchema = z.preprocess(firstParam, z.enum(VIDEO_TYPE_FILTERS)).optional();

function firstParam(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Convierte los searchParams crudos de Next (Promise) en filtros tipados.
 */
export function parseSearchFilters(raw: RawSearchParams): SearchFilters {
  return {
    q: safeField(qSchema, raw.q) ?? "",
    category: safeField(categorySchema, raw.category) as CategoryId | undefined,
    duration: safeField(durationSchema, raw.duration),
    language: safeField(languageSchema, raw.language) ?? "both",
    date: safeField(dateSchema, raw.date),
    order: safeField(orderSchema, raw.order),
    videoType: safeField(videoTypeSchema, raw.videoType),
  };
}

/** Valores inválidos o ausentes -> undefined, sin tumbar el resto de la URL. */
function safeField<T>(schema: ZodType<T | undefined>, value: unknown): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

/** Construye la URL canónica de búsqueda omitiendo los filtros sin valor. */
export function buildSearchUrl(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.duration) params.set("duration", filters.duration);
  if (filters.language !== "both") params.set("language", filters.language);
  if (filters.date) params.set("date", filters.date);
  if (filters.order) params.set("order", filters.order);
  if (filters.videoType && filters.videoType !== "all") params.set("videoType", filters.videoType);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}
