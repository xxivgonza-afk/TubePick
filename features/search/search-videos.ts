import { mapIntent, buildDisplayQuery } from "@/services/intent-mapper";
import { searchVideos as searchVideosRepository } from "@/repositories/youtube";
import { toSearchError } from "@/services/youtube-api";
import type { SearchFilters, SearchOutcome } from "@/types/search";

/**
 * Orquestación del buscador (lado servidor):
 * filtros (URL) -> intent-mapper -> repository (con caché) -> resultado.
 *
 * Si mañana el motor de reglas no convence, solo cambia `mapIntent`
 * por una llamada a un LLM; esta función y todo lo demás queda igual.
 */
export async function searchVideos(filters: SearchFilters): Promise<SearchOutcome> {
  const params = mapIntent(filters);
  try {
    const { videos, fromFallback } = await searchVideosRepository(params);
    return { videos, params, displayQuery: buildDisplayQuery(filters), fromFallback };
  } catch (error) {
    return {
      videos: [],
      params,
      displayQuery: buildDisplayQuery(filters),
      error: toSearchError(error),
    };
  }
}
