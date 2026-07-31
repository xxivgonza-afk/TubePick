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
 * categoría (sin importar las keywords exactas). Si la cuota diaria se agota,
 * sirve esta caché como degradación en vez de un error duro para todos.
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
  });
  return hashKey(`videos:${canonical}`);
}

function buildCategoryCacheKey(params: NormalizedSearchParams): string {
  return hashKey(`category:${params.category ?? "any"}:${params.language ?? "any"}`);
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
  if (cached) return { videos: cached };

  try {
    const videos = await fetchFreshVideos(params);
    searchCache.set(cacheKey, videos);
    categoryCache.set(buildCategoryCacheKey(params), videos);
    return { videos };
  } catch (error) {
    if (error instanceof YouTubeApiError && error.kind === "quota") {
      const fallback = categoryCache.get(buildCategoryCacheKey(params));
      if (fallback) return { videos: fallback, fromFallback: true };
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

  return searchPayload.items
    .map((item) => {
      const detail = detailsById.get(item.id.videoId);
      const merged: VideoListItem = {
        id: item.id.videoId,
        snippet: item.snippet ?? detail?.snippet,
        contentDetails: detail?.contentDetails,
        statistics: detail?.statistics,
      };
      return mapVideo(merged);
    })
    .filter((video) => video.durationSeconds > 0 || video.thumbnailUrl !== "");
}
