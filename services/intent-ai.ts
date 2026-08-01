import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";
import { z } from "zod";
import { CATEGORY_IDS } from "@/constants/categories";
import { GEMINI_API_KEY } from "@/constants/site";
import { TtlCache } from "@/services/cache";
import { hashKey } from "@/lib/hash";
import { normalizeText } from "@/services/intent-mapper";
import type { ConsumptionMode, ResolvedIntent } from "@/types/intent";

/**
 * ============================================================
 *  CAPA DE INTERPRETACIÓN SEMÁNTICA (IA GRATUITA)
 * ============================================================
 *
 * Traduce texto libre a una intención estructurada (`ResolvedIntent`)
 * usando Gemini Flash de Google AI Studio (tier gratuito, sin tarjeta).
 * Es la capa que sustituye las reglas de `mapIntentByRules` cuando está
 * disponible; el producto funciona sin ella (degradación silenciosa).
 *
 * Garantías de diseño:
 *  - JSON forzado por la API: `responseMimeType: "application/json"` +
 *    `responseSchema` (Gemini valida la salida de forma nativa).
 *  - Tiempo límite de 1,5 s: si Gemini tarda más, se degrada a reglas.
 *  - Caché por texto normalizado (30 días): frases repetidas no vuelven
 *    a llamar al modelo. Crítico en un tier gratuito: cada llamada
 *    ahorrada es cuota que dura más el día.
 *  - El usuario nunca ve un error por fallos de Gemini (timeout, red o
 *    cuota gratuita agotada → HTTP 429): se degrada a reglas y se anota
 *    en logs de servidor, para saber si conviene migrar a plan de pago.
 *  - La falta de GEMINI_API_KEY SÍ se reporta como error de configuración
 *    claro (mismo patrón que YOUTUBE_API_KEY): falla temprano, con
 *    instrucciones, en vez de degradar en silencio sin saber por qué.
 * ============================================================
 */

/**
 * Modelo del tier gratuito más ligero disponible para cuentas nuevas.
 * (gemini-2.5-flash ya no se ofrece a usuarios nuevos: 404; verificado
 * con la API el 2026-07-31.)
 */
const MODEL = "gemini-3.5-flash-lite";
/**
 * Presupuesto de latencia para búsquedas normales: por encima, mejor reglas
 * que esperar. El tier gratuito es lento e impredecible (2-16 s): con 4 s
 * se captura una buena parte de las respuestas y el resto degrada rápido.
 */
const TIMEOUT_MS = 4_000;
/**
 * Presupuesto completo para la sorpresa (noCache): es la función estrella y
 * no hay caché que absorba la espera, así que merece latencia completa.
 */
const SURPRISE_TIMEOUT_MS = 15_000;
/** La intención cambia poco: cachear 30 días ahorra llamadas y cuota. */
const INTENT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const intentCache = new TtlCache<ResolvedIntent>(INTENT_CACHE_TTL_MS);

/**
 * Observabilidad del fallback (solo logs de servidor): cuántas búsquedas
 * cayeron a reglas por cuota gratuita agotada. Útil para decidir si el
 * proyecto debe pasar a un tier de pago.
 */
export const fallbackStats = {
  quotaFallbacks: 0,
  totalFallbacks: 0,
};

/**
 * Observabilidad del motor (solo logs de servidor): cuántas intenciones se
 * resolvieron con Gemini (llamada real) y cuántas vinieron de la caché.
 * Permite confirmar que la IA está trabajando y cuánta cuota consume.
 */
export const intentStats = {
  aiResolves: 0,
  cacheHits: 0,
};

/**
 * Esquema de salida forzada. Gemini valida el JSON contra él nativamente;
 * `parseIntent` (Zod) se mantiene como red de seguridad ante respuestas
 * fuera de rango.
 */
const INTENT_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    searchQuery: { type: SchemaType.STRING },
    excludeTerms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    category: { type: SchemaType.STRING, format: "enum", enum: [...CATEGORY_IDS], nullable: true },
    durationBucket: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["short", "medium", "long"],
      nullable: true,
    },
    consumptionMode: { type: SchemaType.STRING, format: "enum", enum: ["focused", "background"] },
    audience: { type: SchemaType.STRING, format: "enum", enum: ["general", "family", "any"] },
    mood: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["relaxing", "energetic", "informative", "funny"],
      nullable: true,
    },
    language: { type: SchemaType.STRING, format: "enum", enum: ["es", "en", "both"] },
  },
  required: [
    "searchQuery",
    "excludeTerms",
    "category",
    "durationBucket",
    "consumptionMode",
    "audience",
    "mood",
    "language",
  ],
};

const moodSchema = z.enum(["relaxing", "energetic", "informative", "funny"]).nullable();
const durationSchema = z.enum(["short", "medium", "long"]).nullable();

const intentSchema = z.object({
  searchQuery: z.string().min(1).max(200),
  excludeTerms: z.array(z.string().min(1).max(50)).max(10).default([]),
  category: z.enum(CATEGORY_IDS).nullable(),
  durationBucket: durationSchema,
  consumptionMode: z.enum(["focused", "background"]),
  audience: z.enum(["general", "family", "any"]),
  mood: moodSchema,
  language: z.enum(["es", "en", "both"]),
});

/** Restricciones del usuario que el modelo debe respetar por encima de la inferencia. */
interface IntentConstraints {
  consumption?: ConsumptionMode;
  family?: boolean;
  /** No leer ni escribir la caché (frases únicas: sorpresa). */
  noCache?: boolean;
}

const SYSTEM_PROMPT = `Eres el motor de interpretación de intención de TubePick, un asistente que recomienda videos de YouTube a partir de una frase del usuario en español o inglés.

Tu trabajo: inferir la intención REAL detrás de la frase, no las palabras literales. Ejemplo: "algo para ver mientras como" significa contenido ligero de entretenimiento para consumo pasivo, NO videos sobre comida.

Reglas:
1. searchQuery: la query optimizada para YouTube. Usa entre 2 y 6 PALABRAS CLAVE ordenadas por importancia (p.ej. "comedia ligera", "documental historia", "podcast relajante"), no frases completas ni palabras de relleno ("video", "ver", "interesante" repetido). Cuantas menos palabras, más resultados relevantes devuelve YouTube.
2. excludeTerms: términos a excluir cuando la frase pide evitarlos (p.ej. "sin sustos", "sin spoilers") o cuando la inclusión degradaría el resultado.
3. category: una de estas categorías (solo si es clara): ${CATEGORY_IDS.join(", ")}. Si no hay una categoría dominante, null.
4. durationBucket: short (<4 min), medium (4-20 min), long (>20 min). Null si el usuario no la condiciona.
5. consumptionMode: "background" si el usuario verá el contenido de fondo mientras hace otra cosa (comer, trabajar, limpiar, dormir); "focused" si prestará atención completa (aprender, documental con detalle).
6. audience: "family" SOLO si el usuario pide explícitamente contenido para niños o familia (hijos, sobrinos, bebés, dibujos). En cualquier otro caso usa "general" (contenido para adultos o público general) o "any" (contenido neutro apto para cualquiera, sin matiz). Nunca asumas "family" por defecto: contenido de entretenimiento normal para adultos es "general", aunque sea apto para niños.
7. mood: relaxing, energetic, informative o funny. Null si no es determinante.
8. language: el idioma de la frase ("es", "en") o "both" si es neutra.

Ejemplos:
- Usuario: "quiero ver algo mientras como"
  Respuesta: {"searchQuery":"comedia ligera","excludeTerms":[],"category":"humor","durationBucket":"medium","consumptionMode":"background","audience":"general","mood":"funny","language":"es"}
- Usuario: "algo para ver mientras trabajo"
  Respuesta: {"searchQuery":"podcast interesante","excludeTerms":[],"category":"podcasts","durationBucket":"medium","consumptionMode":"background","audience":"general","mood":"informative","language":"es"}
- Usuario: "documental de historia para ver con atención"
  Respuesta: {"searchQuery":"documental historia completo","excludeTerms":[],"category":"documentales","durationBucket":"long","consumptionMode":"focused","audience":"general","mood":"informative","language":"es"}
- Usuario: "algo para mi hijo de 5 años"
  Respuesta: {"searchQuery":"dibujos animados educativos","excludeTerms":[],"category":null,"durationBucket":"short","consumptionMode":"background","audience":"family","mood":"funny","language":"es"}
- Usuario: "quiero aprender React"
  Respuesta: {"searchQuery":"tutorial react principiantes","excludeTerms":[],"category":"programacion","durationBucket":"medium","consumptionMode":"focused","audience":"general","mood":"informative","language":"es"}
- Usuario: "los mejores goles de esta semana"
  Respuesta: {"searchQuery":"mejores goles semana","excludeTerms":[],"category":"deportes","durationBucket":"short","consumptionMode":"background","audience":"general","mood":"energetic","language":"es"}
- Usuario: "canciones para relajarme antes de dormir"
  Respuesta: {"searchQuery":"musica relajante dormir","excludeTerms":[],"category":"musica","durationBucket":"medium","consumptionMode":"background","audience":"general","mood":"relaxing","language":"es"}
- Usuario: "dibujos animados para ver con mis sobrinos"
  Respuesta: {"searchQuery":"dibujos animados divertidos","excludeTerms":[],"category":null,"durationBucket":"short","consumptionMode":"background","audience":"family","mood":"funny","language":"es"}
- Usuario: "quiero ver algo estilo clavero y luisito comunica pero que no sean ellos"
  Respuesta: {"searchQuery":"vlog viajes curiosidades","excludeTerms":["clavero","luisito comunica"],"category":"documentales","durationBucket":"medium","consumptionMode":"background","audience":"general","mood":"informative","language":"es"}

Responde EXCLUSIVAMENTE con el objeto JSON del esquema, sin texto adicional ni markdown.`;

/**
 * Error de configuración: falta GEMINI_API_KEY. Se reporta de forma clara
 * (nunca se degrada en silencio por esto), igual que YOUTUBE_API_KEY.
 */
export class IntentConfigError extends Error {
  readonly configKey = "gemini" as const;

  constructor(message: string) {
    super(message);
    this.name = "IntentConfigError";
  }
}

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    model = new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: INTENT_RESPONSE_SCHEMA,
      },
    });
  }
  return model;
}

/**
 * Intenta resolver la intención con Gemini. Garantías:
 *  - sin GEMINI_API_KEY → lanza IntentConfigError (configuración, no fallo de IA)
 *  - timeout (>1,5 s), red o cuota gratuita (HTTP 429) → null + log de servidor
 *  - respuesta inválida o JSON fuera de esquema → null
 * En todos los casos de fallo, el orquestador degrada a mapIntentByRules.
 */
export async function resolveIntent(
  query: string,
  constraints: IntentConstraints = {}
): Promise<ResolvedIntent | null> {
  const normalized = normalizeText(query);
  if (normalized.length === 0) return null;

  const cacheKey = hashKey(
    `intent:${normalized}:${constraints.consumption ?? "auto"}:${constraints.family ? "family" : "auto"}`
  );
  if (!constraints.noCache) {
    const cached = intentCache.get(cacheKey);
    if (cached) {
      intentStats.cacheHits += 1;
      return cached;
    }
  }

  if (!GEMINI_API_KEY) {
    throw new IntentConfigError(
      "Falta la variable de entorno GEMINI_API_KEY (motor semántico). Créala gratis en https://aistudio.google.com, añádela en .env.local y reinicia el servidor."
    );
  }

  try {
    const result = await getModel().generateContent(
      {
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(normalized, constraints) }],
          },
        ],
      },
      { timeout: constraints.noCache ? SURPRISE_TIMEOUT_MS : TIMEOUT_MS }
    );

    const text = result.response.text();
    if (!text) return null;

    const intent = parseIntent(text);
    if (!intent) return null;

    if (!constraints.noCache) intentCache.set(cacheKey, intent);
    intentStats.aiResolves += 1;
    console.info(
      `[intent-ai] Gemini resolvió «${normalized}» → ${JSON.stringify({
        searchQuery: intent.searchQuery,
        category: intent.category,
        consumptionMode: intent.consumptionMode,
        audience: intent.audience,
      })}`
    );
    return intent;
  } catch (error) {
    recordFallback(error);
    return null;
  }
}

/** Anota el fallback en logs de servidor, distinguiendo cuota gratuita agotada. */
function recordFallback(error: unknown): void {
  fallbackStats.totalFallbacks += 1;
  if (isQuotaExceeded(error)) {
    fallbackStats.quotaFallbacks += 1;
    console.warn(
      `TubePick: cuota gratuita de Gemini agotada (${fallbackStats.quotaFallbacks}ª vez en esta ejecución). Usando reglas; si esto es frecuente, valora un plan de pago.`
    );
  } else if (error instanceof Error && error.name === "AbortError") {
    console.warn(`TubePick: intención por IA agotó el tiempo (${TIMEOUT_MS} ms), usando reglas.`);
  } else {
    console.warn("TubePick: intención por IA falló, usando reglas.", error);
  }
}

function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError) {
    return error.status === 429;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /quota|resource_exhausted|429/i.test(message);
}

function buildUserPrompt(normalized: string, constraints: IntentConstraints): string {
  let prompt = `Frase del usuario: "${normalized}"`;
  if (constraints.consumption) {
    prompt += `\nEl usuario eligió explícitamente: consumptionMode="${constraints.consumption}". Respétalo aunque la frase no lo diga.`;
  }
  if (constraints.family) {
    prompt += `\nEl usuario activó explícitamente el modo familia: audience="family".`;
  }
  return prompt;
}

/** Parsea el texto del modelo: acepta JSON puro o JSON envuelto en markdown. */
export function parseIntent(text: string): ResolvedIntent | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(cleaned);
    const result = intentSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
