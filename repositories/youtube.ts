import { callYouTubeApi, YouTubeApiError } from "@/services/youtube-api";
import { hashKey } from "@/lib/hash";
import { TtlCache } from "@/services/cache";
import { parseIsoDuration } from "@/utils/format";
import { searchResponseSchema, videoListResponseSchema, type VideoListItem } from "@/services/youtube-schemas";
import type { NormalizedSearchParams } from "@/types/search";
import type { Video } from "@/types/video";

/**
 * TTL de la caché: 12 horas. La búsqueda cuesta ~101 unidades de cuota
 * (search.list = 100 + videos.list = 1), así que con 10.000 unidades/día
 * hay presupuesto para ~100 búsquedas frescas. La caché absorbe las
 * búsquedas repetidas y populares (categorías del home, sorpréndeme...).
 */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Revalidación del Data Cache de Next (nivel CDN/infraestructura en Vercel),
 * capa compartida entre instancias serverless. Complementa a la caché
 * en memoria de esta instancia.
 */
const FETCH_REVALIDATE_SECONDS = 12 * 60 * 60;

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
    duration: params.duration,
    language: params.language,
    publishedAfter: params.publishedAfter,
    order: params.order,
    maxResults: params.maxResults,
    videoType: params.videoType,
  });
  return hashKey(`videos:${canonical}`);
}

function buildCategoryCacheKey(params: NormalizedSearchParams): string {
  return hashKey(`category:${params.category ?? "any"}:${params.language ?? "any"}`);
}

/** Términos excluidos por el usuario ("-fantasmas") presentes en las keywords. */
function extractExcludedTerms(params: NormalizedSearchParams): string[] {
  return params.keywords
    .filter((keyword) => keyword.startsWith("-"))
    .map((keyword) => keyword.slice(1))
    .filter((term) => term.length > 0);
}

/**
 * Aplica los filtros del usuario a un lote crudo de videos: primero las
 * exclusiones, luego el tipo de contenido (shorts/videos). Se usa tanto al
 * servir caché como al servir datos frescos, para que todos los caminos
 * (fresh, searchCache, categoryCache) devuelvan el mismo contrato.
 */
function applyUserFilters(videos: Video[], params: NormalizedSearchParams): Video[] {
  return applyVideoTypeFilter(applyExclusions(videos, extractExcludedTerms(params)), params.videoType);
}

/** Stemming básico de español: reduce plurales a su raíz ("fantasmas" -> "fantasma"). */
function stemSpanish(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/**
 * Filtro post-captura de exclusiones: YouTube trata el operador NOT de la
 * query como una señal blanda, así que descartamos aquí los videos cuyo
 * título o canal contengan un término que el usuario pidió excluir.
 */
function applyExclusions(videos: Video[], excludedTerms: string[]): Video[] {
  if (excludedTerms.length === 0) return videos;
  const stems = excludedTerms.map(stemSpanish);
  return videos.filter(
    (video) =>
      !stems.some(
        (term) =>
          video.title.toLowerCase().includes(term) ||
          video.channelTitle.toLowerCase().includes(term)
      )
  );
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
 */
function applyVideoTypeFilter(videos: Video[], videoType: NormalizedSearchParams["videoType"]): Video[] {
  if (!videoType || videoType === "all") return videos;
  return videos.filter((video) => (videoType === "short" ? isShort(video) : !isShort(video)));
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
}

/**
 * Repository de YouTube. Única puerta de entrada a la API v3.
 *
 * El caché es transparente: el resto de la app llama a `searchVideos` y no
 * sabe (ni necesita saber) si la respuesta viene de caché o del API — salvo
 * el flag `fromFallback`, que la UI usa solo para avisar al usuario.
 */
export async function searchVideos(params: NormalizedSearchParams): Promise<VideoSearchResult> {
  const cacheKey = buildCacheKey(params);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { videos: applyUserFilters(cached, params) };
  }

  try {
    const raw = await fetchFreshVideos(params);
    searchCache.set(cacheKey, raw);
    categoryCache.set(buildCategoryCacheKey(params), raw);
    return { videos: applyUserFilters(raw, params) };
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
  const searchResponse = await callYouTubeApi({
    path: "search",
    params: {
      part: "snippet",
      type: "video",
      q: params.keywords.join(" "),
      maxResults: params.maxResults,
      order: params.order,
      videoDuration: params.duration,
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
