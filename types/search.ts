import type { CategoryId } from "@/constants/categories";
import type {
  DateFilter,
  DurationFilter,
  LanguageFilter,
  OrderFilter,
  VideoTypeFilter,
} from "@/constants/filters";
import type { ConsumptionMode } from "@/types/intent";
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
  /** Cómo quiere consumir el contenido (atención completa / de fondo). */
  consumption?: ConsumptionMode;
  /** True = permitir contenido familiar/infantil; false/ausente = excluirlo. */
  family?: boolean;
  /** Rango de duración en minutos (alternativa a los buckets fijos). */
  durationMin?: number;
  durationMax?: number;
  /** True = búsqueda sorpresa: la IA elige el tema (sin texto ni categoría). */
  sorpresa?: boolean;
}

/** Parámetros de búsqueda ya interpretados, listos para el repository de YouTube. */
export interface NormalizedSearchParams {
  keywords: string[];
  category: CategoryId | null;
  /** Categoría de YouTube para la API (SOLO si el usuario la eligió explícitamente). */
  videoCategoryId?: number;
  duration?: DurationFilter;
  /** Rango de duración en segundos (alternativa a los buckets fijos). */
  durationMinSeconds?: number;
  durationMaxSeconds?: number;
  language?: "es" | "en";
  publishedAfter?: string;
  order: "relevance" | "viewCount" | "date";
  maxResults: number;
  videoType?: VideoTypeFilter;
  /** True = el repository debe descartar contenido infantil post-captura. */
  excludeChildContent?: boolean;
}

export type SearchErrorKind = "config" | "quota" | "api" | "network";

export interface SearchError {
  kind: SearchErrorKind;
  message: string;
  /** Qué servicio falta por configurar (para mostrar instrucciones precisas). */
  configKey?: "youtube" | "gemini";
}

export interface SearchOutcome {
  videos: Video[];
  params: NormalizedSearchParams;
  displayQuery: string;
  error?: SearchError;
  /** true si los videos son recomendaciones guardadas (degradación por cuota agotada). */
  fromFallback?: boolean;
  /** true si la query se relajó para poder dar resultados (consulta estricta vacía). */
  relaxed?: boolean;
  /** Qué capa interpretó la consulta (observabilidad del motor semántico). */
  intentSource?: "ai" | "rules";
  /** Tema concreto elegido por la IA en modo sorpresa (para mostrarlo al usuario). */
  surpriseTopic?: string;
}
