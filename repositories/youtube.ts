import { callYouTubeApi, YouTubeApiError } from "@/services/youtube-api";
import { hashKey } from "@/lib/hash";
import { TtlCache } from "@/services/cache";
import { parseIsoDuration } from "@/utils/format";
import { searchResponseSchema, videoListResponseSchema, type VideoListItem } from "@/services/youtube-schemas";
import { CHILD_CONTENT_PATTERNS, CHILD_EXCLUDE_TERMS } from "@/constants/content-safety";
import type { NormalizedSearchParams } from "@/types/search";
import type { Video } from "@/types/video";

/**
 * TTL de la caché: 24 horas. La búsqueda cuesta ~101 unidades de cuota
 * (search.list = 100 + videos.list = 1), así que con 10.000 unidades/día
 * hay presupuesto para ~100 búsquedas frescas. Un TTL largo duplica la
 * capacidad efectiva para el lanzamiento: los resultados de una búsqueda
 * cambian poco en un día. La caché absorbe las búsquedas repetidas y
 * populares (categorías del home, sorpréndeme...).
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Revalidación del Data Cache de Next (nivel CDN/infraestructura en Vercel),
 * capa compartida entre instancias serverless. Complementa a la caché
 * en memoria de esta instancia.
 */
const FETCH_REVALIDATE_SECONDS = 24 * 60 * 60;

const searchCache = new TtlCache<Video[]>(CACHE_TTL_MS);

/**
 * Caché de respaldo por categoría: guarda la última búsqueda exitosa de cada
 * categoría en su forma CRUDA (sin filtros de exclusions/videoType aplicados).
 * Si la cuota diaria se agota, sirve esta caché como degradación y aplica los
 * filtros al leer. Almacenarla cruda es clave: la clave solo distingue
 * categoría+idioma, así que la misma entrada debe poder servir a cualquier
 * combinación de videoType o exclusiones del usuario.
 */
const categoryCache = new TtlCache<Video[]>(CACHE_TTL_MS);

function buildCacheKey(params: NormalizedSearchParams): string {
  const canonical = JSON.stringify({
    keywords: params.keywords,
    category: params.category,
    videoCategoryId: params.videoCategoryId,
    duration: params.duration,
    durationMinSeconds: params.durationMinSeconds,
    durationMaxSeconds: params.durationMaxSeconds,
    language: params.language,
    publishedAfter: params.publishedAfter,
    order: params.order,
    maxResults: params.maxResults,
    videoType: params.videoType,
  });
  return hashKey(`videos:${canonical}`);
}

function buildCategoryCacheKey(params: NormalizedSearchParams): string {
  return hashKey(
    `category:${params.category ?? "any"}:${params.language ?? "any"}:${params.videoType ?? "any"}`
  );
}

/** Términos excluidos por el usuario ("-fantasmas") presentes en las keywords. */
function extractExcludedTerms(params: NormalizedSearchParams): string[] {
  return params.keywords
    .filter((keyword) => keyword.startsWith("-"))
    .map((keyword) => keyword.slice(1))
    .filter((term) => term.length > 0);
}

/**
 * Aplica los filtros del usuario a un lote crudo de videos: exclusiones,
 * seguridad de contenido, rango de duración y tipo de contenido. Se usa
 * tanto al servir caché como al servir datos frescos, para que todos los
 * caminos (fresh, searchCache, categoryCache) devuelvan el mismo contrato.
 */
function applyUserFilters(videos: Video[], params: NormalizedSearchParams): Video[] {
  let result = applyExclusions(videos, extractExcludedTerms(params));
  if (params.excludeChildContent) result = applyChildContentFilter(result);
  result = applyDurationRange(result, params.durationMinSeconds, params.durationMaxSeconds);
  return applyVideoTypeFilter(result, params.videoType);
}

/**
 * Stemming básico de español: reduce plurales a su raíz ("fantasmas" -> "fantasma").
 */
function stemSpanish(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Normaliza un texto a palabras sin acentos (igual que el intent-mapper). */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Filtro post-captura de exclusiones: YouTube trata el operador NOT de la
 * query como una señal blanda, así que descartamos aquí los videos cuyo
 * título o canal contengan un término que el usuario pidió excluir.
 * El matching es por PALABRA (con stemming y sin acentos), no por substring:
 * "excluir casas" no debe tumbar "Casablanca", pero sí "fantasmas"/"fantasma".
 * Un término corto también matchea palabras compuestas que empiezan por él
 * ("gta" -> "gta5", "gtav").
 */
function applyExclusions(videos: Video[], excludedTerms: string[]): Video[] {
  if (excludedTerms.length === 0) return videos;
  const stems = excludedTerms.map(stemSpanish);
  return videos.filter((video) => {
    const words = new Set([
      ...tokenizeWords(video.title).map(stemSpanish),
      ...tokenizeWords(video.channelTitle).map(stemSpanish),
    ]);
    return !stems.some((term) =>
      [...words].some((word) => {
        if (word === term) return true;
        return word.startsWith(term) && word.length - term.length <= 2;
      })
    );
  });
}

/**
 * Detección de shorts: la API no expone el tipo de contenido y sus
 * thumbnails son 480x360 incluso para shorts. La señal empírica fiable es
 * la duración: los shorts son videos verticales de ≤ 60 s (medido contra
 * resultados reales, el rango 60-180 s aparece vacío). Como red de
 * seguridad, un video de ≤ 3 min con el tag #shorts también cuenta.
 */
function isShort(video: Video): boolean {
  if (video.durationSeconds > 0 && video.durationSeconds <= 60) return true;
  if (video.durationSeconds > 180) return false;
  return /#shorts/i.test(`${video.title} ${video.description}`);
}

/**
 * Filtra por tipo de contenido pedido por el usuario. La búsqueda siempre
 * trae una mezcla de videos y shorts; aquí se queda solo lo que pidió.
 * Los en vivo (videoType="live") se resuelven con eventType en la llamada
 * a la API, así que aquí no aplican filtros extra.
 */
function applyVideoTypeFilter(videos: Video[], videoType: NormalizedSearchParams["videoType"]): Video[] {
  if (!videoType || videoType === "all" || videoType === "live") return videos;
  return videos.filter((video) => (videoType === "short" ? isShort(video) : !isShort(video)));
}

/**
 * Filtro post-captura de contenido infantil: descarta videos cuyo título o
 * canal coincide con patrones conocidos de contenido para niños. Es la red
 * de seguridad que complementa los términos de exclusión de la query.
 */
function applyChildContentFilter(videos: Video[]): Video[] {
  return videos.filter(
    (video) =>
      !CHILD_CONTENT_PATTERNS.some(
        (pattern) => pattern.test(video.title) || pattern.test(video.channelTitle)
      )
  );
}

/**
 * Filtro de duración por rango (alternativa a los buckets de la API):
 * se aplica post-captura sobre los segundos reales del video.
 */
function applyDurationRange(
  videos: Video[],
  minSeconds: number | undefined,
  maxSeconds: number | undefined
): Video[] {
  if (!minSeconds && !maxSeconds) return videos;
  return videos.filter(
    (video) =>
      (!minSeconds || video.durationSeconds >= minSeconds) &&
      (!maxSeconds || video.durationSeconds <= maxSeconds)
  );
}

function mapVideo(item: VideoListItem): Video {
  const snippet = item.snippet;
  const thumbnail = snippet?.thumbnails?.high ?? snippet?.thumbnails?.medium;
  return {
    id: item.id,
    title: snippet?.title ?? "Video sin título",
    channelId: snippet?.channelId ?? "",
    channelTitle: snippet?.channelTitle ?? "Canal desconocido",
    description: snippet?.description ?? "",
    thumbnailUrl: thumbnail?.url ?? "",
    thumbnailWidth: thumbnail?.width ?? 640,
    thumbnailHeight: thumbnail?.height ?? 360,
    publishedAt: snippet?.publishedAt ?? "",
    durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? "PT0S"),
    viewCount: Number(item.statistics?.viewCount ?? 0),
  };
}

export interface VideoSearchResult {
  videos: Video[];
  /** true si los videos vienen de la caché de categoría (degradación por cuota). */
  fromFallback?: boolean;
  /** true si la query se relajó para poder dar resultados (consulta estricta vacía). */
  relaxed?: boolean;
}

/**
 * Variantes de la query cuando el resultado estricto queda vacío. El objetivo
 * es SIEMPRE devolver algo: una consulta natural ("estilo clavero y luisito
 * comunica pero que no sean ellos") acumula exclusiones (las del usuario +
 * las automáticas de seguridad infantil) y YouTube llega a devolver 0 o 1
 * resultado. Se relaja por niveles, de menos a más invasivo:
 *  1. Se quitan SOLO los términos de exclusión infantil automáticos de la
 *     query (el filtro post-captura `excludeChildContent` se mantiene, así
 *     que la protección no se pierde).
 *  2. Además se quitan las exclusiones del usuario y se acotan las keywords
 *     a las principales de la intención (las primeras del listado).
 *  3. Por último se suelta la categoría de YouTube (videoCategoryId), que
 *     puede vaciar resultados en regiones donde la clasificación difiere.
 */
function buildRelaxedVariants(params: NormalizedSearchParams): NormalizedSearchParams[] {
  const childExclusionTerms = new Set(CHILD_EXCLUDE_TERMS.map((term) => `-${term}`));
  const variants: NormalizedSearchParams[] = [];

  const withoutChildExclusions = {
    ...params,
    keywords: params.keywords.filter((keyword) => !childExclusionTerms.has(keyword)),
  };
  variants.push(withoutChildExclusions);

  const mainKeywords = withoutChildExclusions.keywords.filter(
    (keyword) => !keyword.startsWith("-")
  );
  const withoutUserExclusions = {
    ...withoutChildExclusions,
    keywords: mainKeywords.slice(0, 3),
  };
  variants.push(withoutUserExclusions);

  if (params.videoCategoryId !== undefined) {
    variants.push({ ...withoutUserExclusions, videoCategoryId: undefined });
  }

  return variants;
}

/**
 * Intenta una búsqueda con estos params exactos, sirviendo caché si existe
 * y poblando ambas cachés (resultado + categoría) con datos frescos.
 */
async function attemptSearch(params: NormalizedSearchParams): Promise<VideoSearchResult> {
  const cacheKey = buildCacheKey(params);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { videos: applyUserFilters(cached, params) };
  }

  const raw = await fetchFreshVideos(params);
  searchCache.set(cacheKey, raw);
  categoryCache.set(buildCategoryCacheKey(params), raw);
  return { videos: applyUserFilters(raw, params) };
}

/** Parámetros alternativos y más permisivos para el reintento. */
function relaxedVariants(params: NormalizedSearchParams): NormalizedSearchParams[] {
  const variants = buildRelaxedVariants(params);
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = buildCacheKey(variant);
    if (seen.has(key) || key === buildCacheKey(params)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Repository de YouTube. Única puerta de entrada a la API v3.
 *
 * El caché es transparente: el resto de la app llama a `searchVideos` y no
 * sabe (ni necesita saber) si la respuesta viene de caché o del API — salvo
 * el flag `fromFallback`, que la UI usa solo para avisar al usuario.
 *
 * Garantía de robustez: si la consulta estricta no produce ningún video,
 * se reintenta con variantes relajadas (`relaxed: true`) antes de rendirse.
 * Un usuario que escribe en lenguaje natural nunca debería quedarse sin
 * resultados por culpa de una query sobreexigida.
 */
export async function searchVideos(params: NormalizedSearchParams): Promise<VideoSearchResult> {
  try {
    const main = await attemptSearch(params);
    if (main.videos.length > 0) return main;

    for (const variant of relaxedVariants(params)) {
      const attempt = await attemptSearch(variant);
      if (attempt.videos.length > 0) {
        return { ...attempt, relaxed: true };
      }
    }
    return main;
  } catch (error) {
    if (error instanceof YouTubeApiError && error.kind === "quota") {
      const fallback = categoryCache.get(buildCategoryCacheKey(params));
      if (fallback) {
        return { videos: applyUserFilters(fallback, params), fromFallback: true };
      }
    }
    throw error;
  }
}

async function fetchFreshVideos(params: NormalizedSearchParams): Promise<Video[]> {
  const hasCustomRange = Boolean(params.durationMinSeconds || params.durationMaxSeconds);
  const searchResponse = await callYouTubeApi({
    path: "search",
    params: {
      part: "snippet",
      type: "video",
      q: params.keywords.join(" "),
      maxResults: params.maxResults,
      order: params.order,
      // Los buckets de la API no aplican con rango exacto, ni para en vivo
      // (los directos duran horas; exigirles "corto" vacía los resultados),
      // ni para shorts (≤60s, el post-filtro ya los recorta): el bucket
      // inferido por la IA (p.ej. "medium") vaciaría la búsqueda.
      videoDuration:
        hasCustomRange ||
        params.videoType === "live" ||
        params.videoType === "short"
          ? undefined
          : params.duration,
      eventType: params.videoType === "live" ? "live" : undefined,
      videoCategoryId: params.videoCategoryId,
      relevanceLanguage: params.language,
      publishedAfter: params.publishedAfter,
      safeSearch: "moderate",
    },
    revalidateSeconds: FETCH_REVALIDATE_SECONDS,
  });

  const searchPayload = searchResponseSchema.parse(searchResponse);
  const videoIds = searchPayload.items
    .map((item) => item.id.videoId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (videoIds.length === 0) return [];

  const detailsResponse = await callYouTubeApi({
    path: "videos",
    params: {
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
    },
    revalidateSeconds: FETCH_REVALIDATE_SECONDS,
  });

  const detailsPayload = videoListResponseSchema.parse(detailsResponse);
  const detailsById = new Map(detailsPayload.items.map((item) => [item.id, item]));

  /**
   * Devuelve los videos CRUDOS: los filtros del usuario (exclusiones y
   * videoType) los aplica `searchVideos` con `applyUserFilters`, y así la
   * caché de categoría puede servir cualquier combinación posterior.
   */
  return searchPayload.items
    .map((item) => {
      const detail = detailsById.get(item.id.videoId);
      const mergedItem: VideoListItem = {
        id: item.id.videoId,
        snippet: item.snippet ?? detail?.snippet,
        contentDetails: detail?.contentDetails,
        statistics: detail?.statistics,
      };
      return mapVideo(mergedItem);
    })
    .filter((video) => video.durationSeconds > 0 || video.thumbnailUrl !== "");
}
