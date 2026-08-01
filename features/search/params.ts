import { z, type ZodType } from "zod";
import { CATEGORY_IDS, type CategoryId } from "@/constants/categories";
import {
  CONSUMPTION_FILTERS,
  DATE_FILTERS,
  DURATION_FILTERS,
  DURATION_RANGE_LIMITS,
  LANGUAGE_FILTERS,
  ORDER_FILTERS,
  VIDEO_TYPE_FILTERS,
} from "@/constants/filters";
import type { SearchFilters } from "@/types/search";

/**
 * Esquema Zod de los query params de la URL. Única fuente de verdad de la
 * forma canónica:
 * /search?q=...&category=...&duration=...&language=...&date=...&order=...&videoType=...&consumption=...&family=1&durationMin=...&durationMax=...
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
const consumptionSchema = z.preprocess(firstParam, z.enum(CONSUMPTION_FILTERS)).optional();
const familySchema = z.preprocess(firstParam, z.literal("1")).optional();
const sorpresaSchema = z.preprocess(firstParam, z.literal("1")).optional();
const minutesSchema = z.preprocess(
  firstParam,
  z.coerce.number().int().min(DURATION_RANGE_LIMITS.min).max(DURATION_RANGE_LIMITS.max)
);
const durationMinSchema = minutesSchema.optional();
const durationMaxSchema = minutesSchema.optional();

function firstParam(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Convierte los searchParams crudos de Next (Promise) en filtros tipados.
 */
export function parseSearchFilters(raw: RawSearchParams): SearchFilters {
  const durationMin = safeField(durationMinSchema, raw.durationMin);
  const durationMax = safeField(durationMaxSchema, raw.durationMax);
  const family = safeField(familySchema, raw.family);
  const sorpresa = safeField(sorpresaSchema, raw.sorpresa);
  // Un rango invertido (min > max) nunca debe producir resultados vacíos:
  // se interpreta como lo que el usuario quiso decir (los extremos intercambiados).
  const [sortedMin, sortedMax] =
    durationMin !== undefined && durationMax !== undefined && durationMin > durationMax
      ? [durationMax, durationMin]
      : [durationMin, durationMax];
  return {
    q: safeField(qSchema, raw.q) ?? "",
    category: safeField(categorySchema, raw.category) as CategoryId | undefined,
    duration: safeField(durationSchema, raw.duration),
    language: safeField(languageSchema, raw.language) ?? "both",
    date: safeField(dateSchema, raw.date),
    order: safeField(orderSchema, raw.order),
    videoType: safeField(videoTypeSchema, raw.videoType),
    consumption: safeField(consumptionSchema, raw.consumption),
    family: family === undefined ? undefined : true,
    durationMin: sortedMin,
    durationMax: sortedMax,
    sorpresa: sorpresa === undefined ? undefined : true,
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
  if (filters.consumption) params.set("consumption", filters.consumption);
  if (filters.family) params.set("family", "1");
  if (filters.durationMin) params.set("durationMin", String(filters.durationMin));
  if (filters.durationMax) params.set("durationMax", String(filters.durationMax));
  if (filters.sorpresa) params.set("sorpresa", "1");
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}
