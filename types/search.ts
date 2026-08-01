import type { CategoryId } from "@/constants/categories";
import type {
  DateFilter,
  DurationFilter,
  LanguageFilter,
  OrderFilter,
  VideoTypeFilter,
} from "@/constants/filters";
import type { Video } from "@/types/video";

/** Filtros tal y como los expone la UI y la URL. */
export interface SearchFilters {
  q: string;
  category?: CategoryId;
  duration?: DurationFilter;
  language: LanguageFilter;
  date?: DateFilter;
  order?: OrderFilter;
  videoType?: VideoTypeFilter;
}

/** Parámetros de búsqueda ya interpretados, listos para el repository de YouTube. */
export interface NormalizedSearchParams {
  keywords: string[];
  category: CategoryId | null;
  duration?: DurationFilter;
  language?: "es" | "en";
  publishedAfter?: string;
  order: "relevance" | "viewCount" | "date";
  maxResults: number;
  videoType?: VideoTypeFilter;
}

export type SearchErrorKind = "config" | "quota" | "api" | "network";

export interface SearchError {
  kind: SearchErrorKind;
  message: string;
}

export interface SearchOutcome {
  videos: Video[];
  params: NormalizedSearchParams;
  displayQuery: string;
  error?: SearchError;
  /** true si los videos son recomendaciones guardadas (degradación por cuota agotada). */
  fromFallback?: boolean;
}
