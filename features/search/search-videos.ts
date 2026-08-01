import { getCategoryLabel, getCategoryYouTubeId } from "@/constants/categories";
import { IntentConfigError, resolveIntent } from "@/services/intent-ai";
import {
  buildDisplayQuery,
  detectFamilyRequest,
  durationRangeFromFilters,
  mapIntentByRules,
  publishedAfterFromFilters,
} from "@/services/intent-mapper";
import { searchVideos as searchVideosRepository } from "@/repositories/youtube";
import { toSearchError } from "@/services/youtube-api";
import { CHILD_EXCLUDE_TERMS } from "@/constants/content-safety";
import type { ResolvedIntent } from "@/types/intent";
import type { NormalizedSearchParams, SearchFilters, SearchOutcome } from "@/types/search";

/**
 * Orquestación del buscador (lado servidor):
 * filtros (URL) -> intención (IA con fallback de reglas) -> repository (con caché) -> resultado.
 *
 * TODA búsqueda pasa por la capa semántica (services/intent-ai.ts): cuando el
 * usuario escribe, se interpreta su frase; cuando explora una categoría o llega
 * sin texto, se le construye una frase de exploración natural para que Gemini
 * genere la selección más específica posible. En modo sorpresa (`sorpresa=1`)
 * Gemini elige el tema directamente, adaptado a los intereses del usuario
 * (`context.userTerms`, recogidos de favoritos/búsquedas locales) cuando los
 * hay. Solo si Gemini falla (timeout, red o cuota gratuita agotada),
 * `mapIntentByRules` (motor determinístico) produce el mismo contrato. El
 * usuario nunca ve un error por fallos de la IA; solo si falta
 * GEMINI_API_KEY (configuración).
 */
export async function searchVideos(
  filters: SearchFilters,
  context: SearchContext = {}
): Promise<SearchOutcome> {
  let intent: ResolvedIntent | null = null;
  try {
    intent = await resolveIntent(buildIntentQuery(filters, context), {
      consumption: filters.consumption,
      family: filters.family,
      noCache: filters.sorpresa === true,
    });
  } catch (error) {
    if (error instanceof IntentConfigError) {
      return {
        videos: [],
        params: applyContentSafety(mapIntentByRules(filters), filters),
        displayQuery: buildDisplayQuery(filters),
        error: { kind: "config", message: error.message, configKey: error.configKey },
        intentSource: "rules",
      };
    }
    // Fallo inesperado de la capa de intención: degradar, nunca romper.
    console.warn("TubePick: la capa de intención falló de forma inesperada, usando reglas.", error);
  }

  const params = intent
    ? toNormalizedParams(intent, filters)
    : applyContentSafety(mapIntentByRules(filters), filters);

  try {
    const { videos, fromFallback, relaxed } = await searchVideosRepository(params);
    return {
      videos,
      params,
      displayQuery: buildDisplayQuery(filters),
      fromFallback,
      relaxed,
      /** El tema concreto que eligió la IA en modo sorpresa (para mostrarlo). */
      surpriseTopic: filters.sorpresa ? intent?.searchQuery : undefined,
      intentSource: intent ? "ai" : "rules",
    };
  } catch (error) {
    return {
      videos: [],
      params,
      displayQuery: buildDisplayQuery(filters),
      error: toSearchError(error),
      intentSource: intent ? "ai" : "rules",
    };
  }
}

/**
 * Contexto anónimo del usuario (solo señal local: favoritos, búsquedas
 * recientes y visitas, resumidos en términos por el navegador).
 */
export interface SearchContext {
  userTerms?: string[];
  visits?: number;
}

/**
 * Frase que se envía a la IA cuando no hay texto escrito por el usuario.
 * La exploración por categoría (y el "descubre" genérico) también deben
 * pasar por Gemini para dar selecciones específicas y coherentes, no los
 * seeds estáticos del motor de reglas. Las frases son estables, así que
 * la caché de intención (30 días) las absorbe con 1 sola llamada.
 *
 * En modo sorpresa Gemini elige un tema CREATIVO: para un usuario nuevo,
 * algo fascinante y poco común; para un usuario con historial (favoritos o
 * búsquedas previas), algo afinado a sus intereses pero distinto de lo que
 * ya conoce. Estas frases incluyen la señal del usuario, así que no se
 * cachean: cada sorpresa es única (y consume cuota de IA mínima).
 */
function buildIntentQuery(filters: SearchFilters, context: SearchContext): string {
  if (filters.sorpresa) {
    const typed = filters.q.trim();
    const hasTerms = Boolean(context.userTerms && context.userTerms.length > 0);
    const habit = (context.visits ?? 0) >= 3 ? " Es un usuario habitual de la web." : "";
    // El texto escrito es el ancla explícita de la sorpresa; sin texto, se
    // usa la señal local (favoritos/búsquedas); sin nada, tema libre.
    const anchor = typed
      ? typed
      : hasTerms
        ? context.userTerms!.join(", ")
        : "";
    if (anchor) {
      return `sorpréndeme con un tema fascinante relacionado con: ${anchor}. Quiero algo NUEVO y específico que no haya visto antes, no repitas esos temas literales. Elige una búsqueda creativa de YouTube para sorprenderlo.${habit}`;
    }
    return "sorpréndeme: elige un tema fascinante, específico y poco común de YouTube para ver ahora. Algo que sorprenda de verdad, con una búsqueda concreta y creativa, no genérica.";
  }
  if (filters.q.trim()) return filters.q;
  if (filters.category) {
    return `muéstrame contenido interesante de ${getCategoryLabel(filters.category)}`;
  }
  return "contenido interesante y variado de YouTube para ver ahora";
}

/**
 * Traduce una intención resuelta por la IA a parámetros de búsqueda.
 * Los filtros explícitos de la UI tienen prioridad sobre la inferencia.
 */
export function toNormalizedParams(
  intent: ResolvedIntent,
  filters: SearchFilters
): NormalizedSearchParams {
  const order: NormalizedSearchParams["order"] =
    filters.order === "views" ? "viewCount" : filters.order === "newest" ? "date" : "relevance";

  const language: NormalizedSearchParams["language"] | undefined =
    filters.language === "both"
      ? intent.language === "both"
        ? undefined
        : intent.language
      : filters.language;

  const baseKeywords = intent.searchQuery.split(/\s+/).filter(Boolean);
  const excludedTerms = intent.excludeTerms.map((term) => `-${term}`);
  const { durationMinSeconds, durationMaxSeconds } = durationRangeFromFilters(filters);

  const params: NormalizedSearchParams = {
    keywords: [...baseKeywords, ...excludedTerms],
    category: filters.category ?? intent.category,
    videoCategoryId: getCategoryYouTubeId(filters.category),
    duration: filters.duration ?? intent.durationBucket ?? undefined,
    durationMinSeconds,
    durationMaxSeconds,
    language,
    publishedAfter: publishedAfterFromFilters(filters),
    order,
    maxResults: 24,
    videoType: filters.videoType,
  };

  return applyContentSafety(params, filters, intent);
}

/**
 * Seguridad de contenido: excluye contenido infantil salvo que el usuario
 * lo pida de forma explícita (filtro family, intención family o señales en
 * el texto). Añade términos de exclusión a la query y marca el repository
 * para el filtro post-captura de patrones conocidos.
 */
function applyContentSafety(
  params: NormalizedSearchParams,
  filters: SearchFilters,
  intent?: ResolvedIntent
): NormalizedSearchParams {
  const allowFamily =
    filters.family === true ||
    intent?.audience === "family" ||
    (!intent && detectFamilyRequest(filters.q));

  if (allowFamily) return params;

  return {
    ...params,
    keywords: [...params.keywords, ...CHILD_EXCLUDE_TERMS.map((term) => `-${term}`)],
    excludeChildContent: true,
  };
}
