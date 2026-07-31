export const SITE_NAME = "TubePick";
export const SITE_TAGLINE =
  "Dile a TubePick qué te apetece ver con tus palabras y descubre los mejores videos de YouTube. Sin buscar, sin perder tiempo.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const FAVORITES_STORAGE_KEY = "tubepick:favorites";
export const THEME_STORAGE_KEY = "tubepick:theme";

export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";
