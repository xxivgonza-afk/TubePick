import { CATEGORIES, type Category, type CategoryId } from "@/constants/categories";
import { publishedAfterIso } from "@/utils/format";
import type { NormalizedSearchParams, SearchFilters } from "@/types/search";

/**
 * ============================================================
 *  CAPA DE INTERPRETACIÓN DE INTENCIÓN (Fase 0: motor de reglas)
 * ============================================================
 *
 * Traduce texto libre en lenguaje natural ("quiero algo para comer",
 * "un podcast interesante") a parámetros estructurados de búsqueda:
 * keywords, categoría, duración, idioma, orden y fecha.
 *
 * Es la pieza que la Fase 2 debe validar: si estas reglas producen mejores
 * resultados que buscar directo en YouTube, el producto tiene sentido.
 * La Fase 2 reemplazará ÚNICAMENTE la implementación interna de `mapIntent`
 * por una llamada a un modelo de IA con la misma firma — ni la UI, ni el
 * repository, ni el resto de la app necesitarán cambios.
 *
 * Esta función es pura (sin I/O) y corre en el servidor.
 * ============================================================
 */

const INTENT_PHRASES = [
  "quiero ver",
  "quiero algo",
  "quiero encontrar",
  "quiero que me",
  "estoy buscando",
  "busca algo",
  "me recomiendas",
  "me recomendarias",
  "recomiendame",
  "muestrame",
  "dame un",
  "dame una",
  "dame algo",
  "dame",
  "necesito",
  "tengo ganas de",
  "algo para",
  "para ver",
  "para mirar",
  "por favor",
  "tipo",
];

const STOP_WORDS = new Set([
  "de", "la", "el", "lo", "las", "los", "un", "una", "unos", "unas", "que", "y", "o",
  "a", "en", "por", "para", "con", "sin", "sobre", "entre", "del", "al", "mi", "tu",
  "su", "me", "te", "se", "le", "les", "es", "son", "soy", "esta", "hay", "tengo",
  "ver", "mirar", "algo", "nada", "todo", "bien", "mas", "muy", "pero", "tambien",
  "como", "cuando", "donde", "quien", "que", "cual", "aqui", "hoy", "ahora", "asi",
  "luego", "despues", "entonces", "porque", "ya", "no", "si", "mucho", "mucha",
  "muchos", "muchas", "poco", "poca", "pocos", "quiero", "algun", "alguna", "algunos",
  "alguna", "tambien", "cosas", "cosa", "video", "videos", "youtube", "bueno", "buena",
  "mejor", "interesante", "nuevo", "nueva", "chido", "chévere", "guay",
]);

const DURATION_HINTS: Record<string, string[]> = {
  short: ["corto", "corta", "breve", "rapido", "rapida", "rapidito", "rapidita"],
  medium: ["podcast", "entrevista", "serie", "capitulo", "capitulos"],
  long: ["largo", "larga", "largos", "maraton", "pelicula", "peliculas", "documental", "documentales"],
};

const ORDER_HINTS: Record<string, string[]> = {
  viewCount: ["mas visto", "mas vistos", "popular", "populares", "tendencias", "trending", "famoso", "exitoso", "exitosos"],
  date: ["reciente", "recientes", "recien", "ultimo", "ultima", "esta semana", "de hoy"],
};

const LANGUAGE_HINTS: Record<"es" | "en", string[]> = {
  es: ["en espanol", "espanol", "castellano", "habla hispana"],
  en: ["en ingles", "ingles", "english", "in english"],
};

const GENERIC_INTENT_TERMS = new Set([
  "comer",
  "cocinar",
  "jugar",
  "ver",
  "asustar",
  "invertir",
  "emprender",
  "ahorrar",
  "cantar",
  "bailar",
]);

/** Normaliza: minúsculas + sin acentos. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i").test(text);
}

function detectCategory(
  text: string
): { category?: Category; matched: string[] } {
  for (const category of CATEGORIES) {
    const matched = category.intent.filter((keyword) => containsWord(text, keyword));
    if (matched.length > 0) return { category, matched };
  }
  return { matched: [] };
}

/**
 * Extrae keywords: quita frases de intención, stop words y los términos de la
 * categoría detectada. Si quedan palabras propias del usuario, se conservan
 * y se les añaden los términos específicos de la categoría (react, python,
 * minecraft…), salvo los verbos genéricos de intención ("quiero JUGAR algo").
 */
function extractKeywords(
  text: string,
  category: Category | undefined,
  matchedTerms: string[]
): string[] {
  let cleaned = ` ${text} `;

  for (const phrase of INTENT_PHRASES) {
    cleaned = cleaned.replaceAll(` ${phrase} `, " ");
  }
  cleaned = cleaned.replace(/\s+/g, " ");

  if (category) {
    for (const keyword of category.intent) {
      cleaned = cleaned.replaceAll(` ${keyword} `, " ");
    }
    cleaned = cleaned.replace(/\s+/g, " ");
  }

  const words = cleaned
    .trim()
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  if (words.length === 0) return [];

  const specific = matchedTerms.filter((term) => !GENERIC_INTENT_TERMS.has(term));
  return [...new Set([...words, ...specific])].slice(0, 6);
}

function detectDuration(text: string): NormalizedSearchParams["duration"] {
  for (const [duration, hints] of Object.entries(DURATION_HINTS)) {
    if (hints.some((hint) => containsWord(text, hint))) {
      return duration as NormalizedSearchParams["duration"];
    }
  }
  return undefined;
}

function detectOrder(text: string): NormalizedSearchParams["order"] {
  for (const [order, hints] of Object.entries(ORDER_HINTS)) {
    if (hints.some((hint) => containsWord(text, hint))) {
      return order as NormalizedSearchParams["order"];
    }
  }
  return "relevance";
}

function detectLanguage(text: string): "es" | "en" | undefined {
  for (const hint of LANGUAGE_HINTS.es) {
    if (containsWord(text, hint)) return "es";
  }
  for (const hint of LANGUAGE_HINTS.en) {
    if (containsWord(text, hint)) return "en";
  }
  return undefined;
}

const DATE_DAYS: Record<string, number> = { week: 7, month: 30, year: 365 };

/**
 * Traduce la intención del usuario a parámetros estructurados de búsqueda.
 * Los filtros explícitos de la UI tienen prioridad; el mapper solo infiere
 * lo que el usuario no ha decidido.
 */
export function mapIntent(filters: SearchFilters): NormalizedSearchParams {
  const text = normalizeText(filters.q);

  const detected = filters.category
    ? { category: CATEGORIES.find((c) => c.id === filters.category), matched: [] as string[] }
    : detectCategory(text);
  const category = detected.category;

  const keywords =
    filters.q.trim().length > 0
      ? extractKeywords(text, category, detected.matched)
      : [];

  const effectiveKeywords =
    keywords.length > 0 ? keywords : category ? [...category.seed] : ["viral"];

  const inferredDuration = detectDuration(text);
  const duration = filters.duration ?? inferredDuration;

  const inferredOrder = detectOrder(text);
  const order: NormalizedSearchParams["order"] =
    filters.order === "views" ? "viewCount" : filters.order === "newest" ? "date" : inferredOrder;

  const inferredLanguage = detectLanguage(text);
  const language: NormalizedSearchParams["language"] | undefined =
    filters.language === "both" ? inferredLanguage : filters.language;

  const publishedAfter =
    filters.date && filters.date in DATE_DAYS
      ? publishedAfterIso(DATE_DAYS[filters.date])
      : undefined;

  return {
    keywords: effectiveKeywords,
    category: category?.id ?? null,
    duration,
    language,
    publishedAfter,
    order,
    maxResults: 24,
  };
}

export function buildDisplayQuery(filters: SearchFilters): string {
  const query = filters.q.trim();
  if (query.length > 0) return query;
  const category = CATEGORIES.find((c) => c.id === filters.category);
  return category ? category.label : "Descubrimiento";
}

export type { CategoryId };
