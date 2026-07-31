import { z } from "zod";
import { YOUTUBE_API_KEY } from "@/constants/site";
import type { SearchError } from "@/types/search";

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";
const REQUEST_TIMEOUT_MS = 12_000;

export class YouTubeApiError extends Error {
  readonly kind: SearchError["kind"];

  constructor(kind: SearchError["kind"], message: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.kind = kind;
  }
}

export function toSearchError(error: unknown): SearchError {
  if (error instanceof YouTubeApiError) {
    return { kind: error.kind, message: error.message };
  }
  if (error instanceof z.ZodError) {
    return { kind: "api", message: "La respuesta de YouTube no fue la esperada." };
  }
  return { kind: "network", message: "No se pudo contactar con YouTube. Inténtalo de nuevo." };
}

interface ApiResponse {
  items?: unknown;
  error?: { code: number; message: string; errors?: { reason?: string }[] };
}

export interface ApiCallOptions {
  path: string;
  params: Record<string, string | number | undefined>;
  revalidateSeconds: number;
}

/**
 * Cliente HTTP mínimo para la YouTube Data API v3.
 * No sabe nada de negocio: construye la petición, valida el shape y traduce
 * errores HTTP a errores tipados (cuota, config, red).
 */
export async function callYouTubeApi<T>(options: ApiCallOptions): Promise<T> {
  if (!YOUTUBE_API_KEY) {
    throw new YouTubeApiError(
      "config",
      "Falta la variable de entorno YOUTUBE_API_KEY. Añádela en .env.local y reinicia el servidor."
    );
  }

  const url = new URL(`${YOUTUBE_BASE_URL}/${options.path}`);
  url.searchParams.set("key", YOUTUBE_API_KEY);
  for (const [name, value] of Object.entries(options.params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: options.revalidateSeconds },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new YouTubeApiError("network", "YouTube tardó demasiado en responder.");
    }
    throw new YouTubeApiError("network", "No se pudo contactar con YouTube.");
  }

  let body: ApiResponse;
  try {
    body = (await response.json()) as ApiResponse;
  } catch {
    throw new YouTubeApiError("api", "La respuesta de YouTube no fue JSON válido.");
  }

  if (!response.ok) {
    const reason = body.error?.errors?.[0]?.reason;
    if (response.status === 403 && reason === "quotaExceeded") {
      throw new YouTubeApiError(
        "quota",
        "Se agotó la cuota diaria de la API de YouTube. Vuelve a intentarlo mañana."
      );
    }
    if (response.status === 400 && reason === "keyInvalid") {
      throw new YouTubeApiError("config", "La clave de API de YouTube es inválida.");
    }
    throw new YouTubeApiError(
      "api",
      body.error?.message ?? `YouTube respondió con el estado ${response.status}.`
    );
  }

  return body as T;
}
