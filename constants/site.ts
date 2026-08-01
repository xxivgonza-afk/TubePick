export const SITE_NAME = "TubePick";
export const SITE_TAGLINE =
  "Dile a TubePick qué te apetece ver con tus palabras y descubre los mejores videos de YouTube. Sin buscar, sin perder tiempo.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Donación opcional (Ko-fi): apoyo voluntario, no condiciona ninguna función. */
export const KO_FI_URL = "https://ko-fi.com/jeremysosa";

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
