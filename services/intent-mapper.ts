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
 * V2 del motor:
 *  - Negaciones: "no quiero / sin / que no sea / excepto / evita…"
 *    extrae los términos excluidos y los pasa a la query como
 *    `-término` (operador NOT que YouTube soporta), evitando además
 *    que una categoría se dispare por un término negado.
 *  - Categorías puntuadas: ya no gana el primer match del array;
 *    cada término disparador suma puntos por especificidad, y los
 *    términos de otras categorías se conservan como keywords
 *    ("documental de historia" -> categoría documentales + "historia").
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
  "quiero saber",
  "quiero aprender",
  "quiero escuchar",
  "quiero descubrir",
  "estoy buscando",
  "busca algo",
  "me recomiendas",
  "me recomendarias",
  "recomiendame",
  "dame recomendaciones",
  "recomendaciones de",
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
  "aprender",
  "aprender a",
  "sobre",
  "todo sobre",
  "saber mas de",
  "saber mas sobre",
  "noticias de",
  "lo mejor de",
  "los mejores",
  "las mejores",
  "que hay de nuevo",
  "algo nuevo",
  "lo nuevo",
  "como funciona",
  "top",
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
  "aprender", "aprendo", "saber", "conocer", "descubrir", "desde", "hasta", "cero",
  "ni", "tutoriales", "parte", "partes", "misma", "mismo", "mismos", "mismas",
]);

/**
 * Disparadores de negación. Se procesan de mayor a menor longitud para que
 * "no quiero" capture antes que "no me". Cada entrada indica cuántas
 * palabras máximas se capturan después del disparador como términos a excluir.
 */
const NEGATION_TRIGGERS: Array<{ trigger: string; maxWords: number }> = [
  { trigger: "no quiero", maxWords: 4 },
  { trigger: "no me gusta", maxWords: 4 },
  { trigger: "no me", maxWords: 4 },
  { trigger: "que no sean", maxWords: 4 },
  { trigger: "que no sea", maxWords: 4 },
  { trigger: "que no", maxWords: 4 },
  { trigger: "nada de", maxWords: 3 },
  { trigger: "nada con", maxWords: 3 },
  { trigger: "sin", maxWords: 4 },
  { trigger: "excepto", maxWords: 4 },
  { trigger: "evita", maxWords: 4 },
  { trigger: "quitale", maxWords: 3 },
  { trigger: "quita", maxWords: 3 },
  // Locuciones fijas que parecen negación pero no excluyen nada: se capturan
  // con maxWords: 0 para que "sin embargo", "sin duda"… no se traguen el
  // contenido que les sigue ("un podcast sin embargo de terror").
  { trigger: "sin embargo", maxWords: 0 },
  { trigger: "sin duda", maxWords: 0 },
  { trigger: "sin querer", maxWords: 0 },
];

/**
 * Palabras que cortan una cláusula de negación ("sin miedo pero con sustos",
 * "no quiero deportes quiero humor"). Incluye verbos de intención positiva:
 * "no quiero X quiero Y" debe conservar "quiero Y" como búsqueda, no tragársela.
 */
const NEGATION_ENDERS = new Set([
  "pero",
  "aunque",
  "ademas",
  "tambien",
  "solo",
  "y",
  "o",
  "ni",
  "quiero",
  "necesito",
  "dame",
  "busca",
  "muestrame",
]);

/** Falsos positivos de "sin" ("sin embargo", "sin duda", "sin querer"…) y
 *  subjuntivos de "ser" ("que no sea aburrido" no debe excluir "sea"). */
const NEGATION_BYPASS = new Set([
  "embargo",
  "duda",
  "querer",
  "queriendo",
  "saber",
  "sea",
  "sean",
]);

/** Determinantes/partículas iniciales que se descartan del término excluido. */
const LEADING_DROP = new Set(["de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "a"]);

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
  es: ["en espanol", "espanol", "espanol latino", "en espanol latino", "castellano", "habla hispana"],
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

interface Token {
  word: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const word = m[0]
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
      .toLowerCase();
    if (word.length === 0) continue;
    tokens.push({ word, start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

/**
 * Detecta cláusulas de negación y devuelve:
 *  - `cleaned`: el texto sin las cláusulas negadas (para categoría y keywords).
 *  - `excluded`: términos que el usuario NO quiere (para añadir `-término`).
 */
export function extractNegations(text: string): { cleaned: string; excluded: string[] } {
  const tokens = tokenize(text);
  const excludedRanges: Array<{ start: number; end: number }> = [];
  const excluded: string[] = [];

  const isInRange = (index: number): boolean =>
    excludedRanges.some((range) => index >= range.start && index < range.end);

  const sortedTriggers = [...NEGATION_TRIGGERS].sort(
    (a, b) => b.trigger.split(" ").length - a.trigger.split(" ").length
  );

  for (const { trigger, maxWords } of sortedTriggers) {
    const triggerWords = trigger.split(" ");
    for (let i = 0; i + triggerWords.length <= tokens.length; i++) {
      if (isInRange(i)) continue;
      const matchesTrigger = triggerWords.every((tw, k) => tokens[i + k]?.word === tw);
      if (!matchesTrigger) continue;

      const captured: string[] = [];
      let j = i + triggerWords.length;
      while (j < tokens.length && captured.length < maxWords) {
        if (isInRange(j)) break;
        const word = tokens[j].word;
        if (NEGATION_ENDERS.has(word)) break;
        captured.push(word);
        j++;
      }

      const meaningful = captured.filter((word) => !NEGATION_BYPASS.has(word));
      const leadingDropped = meaningful.filter(
        (word, index) => !(index === 0 && LEADING_DROP.has(word))
      );
      const finalTerms = leadingDropped.filter((word) => !STOP_WORDS.has(word) && word.length >= 2);
      for (const word of finalTerms) excluded.push(word);

      excludedRanges.push({ start: i, end: j });
    }
  }

  excludedRanges.sort((a, b) => a.start - b.start);
  const kept: Token[] = [];
  let cursor = 0;
  for (const range of excludedRanges) {
    for (let t = cursor; t < range.start; t++) kept.push(tokens[t]);
    cursor = Math.max(cursor, range.end);
  }
  for (let t = cursor; t < tokens.length; t++) kept.push(tokens[t]);

  return { cleaned: kept.map((token) => token.word).join(" "), excluded: [...new Set(excluded)] };
}

/** Puntuación de un término disparador: más palabras y longitud = más especificidad. */
function scoreTerm(term: string): number {
  return 1 + (term.split(" ").length - 1) * 0.5 + Math.min(term.length / 30, 0.75);
}

/**
 * Detecta la categoría más probable puntuando cada término disparador.
 * Devuelve también `allMatched`: los términos de TODAS las categorías
 * detectadas (incluidas las que no ganan) para conservarlos como keywords.
 */
function detectCategory(text: string): { category?: Category; allMatched: string[] } {
  const allMatched: string[] = [];
  let best: { category: Category; matched: string[]; score: number } | undefined;

  for (const category of CATEGORIES) {
    const matched = category.intent.filter((keyword) => containsWord(text, keyword));
    if (matched.length === 0) continue;

    const score = matched.reduce((sum, term) => sum + scoreTerm(term), 0);
    allMatched.push(...matched);

    if (
      !best ||
      score > best.score ||
      (score === best.score && matched.length > best.matched.length)
    ) {
      best = { category, matched, score };
    }
  }

  return best
    ? { category: best.category, allMatched: [...new Set(allMatched)] }
    : { allMatched: [] };
}

/**
 * Extrae keywords: quita frases de intención, stop words y los términos de la
 * categoría ganadora. Los términos disparadores (de cualquier categoría) se
 * conservan como keywords específicas, salvo los verbos genéricos de
 * intención ("quiero JUGAR algo").
 */
function extractKeywords(
  text: string,
  category: Category | undefined,
  allMatched: string[]
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

  const specific = allMatched.filter((term) => !GENERIC_INTENT_TERMS.has(term));
  if (words.length === 0 && specific.length === 0) return [];
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
  const { cleaned, excluded } = extractNegations(text);

  const detected = filters.category
    ? { category: CATEGORIES.find((c) => c.id === filters.category), allMatched: [] as string[] }
    : detectCategory(cleaned);
  const category = detected.category;

  const keywords =
    filters.q.trim().length > 0
      ? extractKeywords(cleaned, category, detected.allMatched)
      : [];

  const base =
    keywords.length > 0 ? keywords : category ? [...category.seed] : ["viral"];
  const effectiveKeywords = [...base, ...excluded.map((word) => `-${word}`)];

  const inferredDuration = detectDuration(cleaned);
  const duration = filters.duration ?? inferredDuration;

  const inferredOrder = detectOrder(cleaned);
  const order: NormalizedSearchParams["order"] =
    filters.order === "views" ? "viewCount" : filters.order === "newest" ? "date" : inferredOrder;

  const inferredLanguage = detectLanguage(cleaned);
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
    videoType: filters.videoType,
  };
}

export function buildDisplayQuery(filters: SearchFilters): string {
  const query = filters.q.trim();
  if (query.length > 0) return query;
  const category = CATEGORIES.find((c) => c.id === filters.category);
  return category ? category.label : "Descubrimiento";
}

export type { CategoryId };
