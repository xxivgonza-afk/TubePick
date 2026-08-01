import {
  FAVORITES_STORAGE_KEY,
  SEARCH_HISTORY_STORAGE_KEY,
  USER_CONTEXT_COOKIE,
  VISITS_STORAGE_KEY,
} from "@/constants/site";
import type { Video } from "@/types/video";

/**
 * Contexto de intereses del usuario para personalizar "Sorpréndeme".
 *
 * Sin login ni base de datos (Fase 0): toda la señal vive en el navegador.
 *  - Favoritos (localStorage, el usuario los guarda explícitamente).
 *  - Historial de búsquedas recientes (localStorage).
 *  - Contador de visitas (localStorage).
 *
 * El servidor recibe un resumen anónimo y mínimo vía cookie
 * (`tubepick_ctx`): términos de interés + número de visitas. Con eso la IA
 * adapta la sorpresa: relacionada con sus gustos, pero sin repetir.
 */

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "para",
  "con",
  "por",
  "en",
  "al",
  "del",
  "que",
  "y",
  "o",
  "a",
  "lo",
  "ver",
  "quiero",
  "algo",
  "más",
  "mas",
  "me",
  "mi",
  "the",
  "and",
  "of",
  "to",
  "for",
  "with",
]);

const MAX_TERMS = 12;
const MAX_TERM_LENGTH = 24;
const MAX_HISTORY_ITEMS = 8;
const COOKIE_MAX_AGE_DAYS = 90;

export interface UserContext {
  terms: string[];
  visits: number;
}

/** Normaliza una palabra: minúsculas, sin acentos, solo [a-z0-9 ]. */
export function normalizeUserTerm(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
  return normalized.replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
}

/** Palabras significativas de un texto (sin stopwords ni términos cortos). */
export function extractTerms(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeUserTerm)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .slice(0, 4);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function topTerms(counts: Map<string, number>, limit: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

/**
 * Recoge la señal del navegador (favoritos + búsquedas recientes + visitas)
 * y la resume en términos de interés ordenados por frecuencia.
 * Solo se llama en el cliente (handlers de UI).
 */
export function collectUserContext(): UserContext {
  const favorites = readJson<Record<string, Video>>(FAVORITES_STORAGE_KEY, {});
  const history = readJson<string[]>(SEARCH_HISTORY_STORAGE_KEY, []);
  const visits = readJson<number>(VISITS_STORAGE_KEY, 0);

  const counts = new Map<string, number>();
  for (const term of Object.values(favorites).flatMap((video) => extractTerms(video.title))) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  for (const query of history) {
    for (const term of extractTerms(query)) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }

  return { terms: topTerms(counts, MAX_TERMS), visits };
}

/** Registra una búsqueda reciente (máx 8, sin repetir). Solo en el cliente. */
export function recordSearchQuery(query: string): void {
  const normalized = normalizeUserTerm(query);
  if (normalized.length === 0) return;
  try {
    const history = readJson<string[]>(SEARCH_HISTORY_STORAGE_KEY, []);
    const next = [normalized, ...history.filter((item) => item !== normalized)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin persistencia disponible: la sorpresa no se personaliza, no pasa nada.
  }
}

/** Incrementa el contador de visitas. Solo en el cliente. */
export function bumpVisitCount(): void {
  try {
    const visits = readJson<number>(VISITS_STORAGE_KEY, 0) + 1;
    window.localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Sin persistencia disponible: ignorar.
  }
}

/** Escribe la cookie de contexto (90 días). Solo en el cliente. */
export function writeUserContextCookie(context: UserContext): void {
  const value = encodeURIComponent(`v=${context.visits};t=${context.terms.join(",")}`);
  try {
    document.cookie = `${USER_CONTEXT_COOKIE}=${value}; max-age=${COOKIE_MAX_AGE_DAYS * 24 * 60 * 60}; path=/; samesite=lax`;
  } catch {
    // Sin cookies: la sorpresa será genérica, no pasa nada.
  }
}

/** Parsea el valor crudo de la cookie de contexto (seguro para servidor). */
export function parseUserContextCookie(raw: string | undefined | null): UserContext {
  if (!raw) return { terms: [], visits: 0 };
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Cookie malformada: usar la parte ya legible.
  }
  const visits = Number(/(?:^|;)v=(\d+)/.exec(decoded)?.[1] ?? 0);
  const termsRaw = /(?:^|;)t=([^;]*)/.exec(decoded)?.[1] ?? "";
  const terms = termsRaw
    .split(",")
    .map((term) => term.trim())
    .map(normalizeUserTerm)
    .filter((term) => term.length >= 3)
    .slice(0, MAX_TERMS);
  return { terms, visits: Number.isFinite(visits) ? visits : 0 };
}
