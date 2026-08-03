export const SITE_NAME = "TubePick";
export const SITE_TAGLINE =
  "Dile a TubePick qué te apetece ver con tus palabras y descubre los mejores videos de YouTube. Sin buscar, sin perder tiempo.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Donación opcional (Ko-fi): apoyo voluntario, no condiciona ninguna función. */
export const KO_FI_URL = "https://ko-fi.com/jeremysosa";

/**
 * Aparato legal. Sustituye OPERATOR_NAME por el nombre real del operador
 * (persona física o empresa) antes del lanzamiento si quieres identificarlo
 * explícitamente en el aviso legal.
 */
export const OPERATOR_NAME = "JeremySosa";
export const OPERATOR_CONTACT = `Mensaje privado a través de Ko-fi (${KO_FI_URL})`;
export const JURISDICTION = "España";
export const LEGAL_LAST_UPDATED = "1 de agosto de 2026";
/** Cookie única de personalización (intereses + visitas), 90 días. */
export const USER_CONTEXT_COOKIE_TTL_DAYS = 90;
/** Clave en localStorage del consentimiento de cookies. */
export const COOKIE_CONSENT_KEY = "tubepick:cookie-consent";

export const FAVORITES_STORAGE_KEY = "tubepick:favorites";
export const THEME_STORAGE_KEY = "tubepick:theme";
export const SEARCH_HISTORY_STORAGE_KEY = "tubepick:search-history";
export const VISITS_STORAGE_KEY = "tubepick:visits";
/** Cookie con el contexto de intereses del usuario (términos + visitas). */
export const USER_CONTEXT_COOKIE = "tubepick_ctx";

export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

/**
 * Clave de Google AI Studio para la capa semántica (services/intent-ai.ts).
 * Se genera gratis en https://aistudio.google.com (modelo Gemini Flash, sin
 * tarjeta). Se valida en la primera búsqueda igual que YOUTUBE_API_KEY:
 * si falta, el servidor avisa con un error de configuración claro.
 */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
