import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envKey = vi.hoisted(() => ({ value: "test-key" }));

const sdkMock = vi.hoisted(() => {
  const generateContent = vi.fn();
  const modelParamsRef: { current: Record<string, unknown> | null } = { current: null };
  return { generateContent, modelParamsRef };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(params: Record<string, unknown>) {
      sdkMock.modelParamsRef.current = params;
      return { generateContent: sdkMock.generateContent };
    }
  },
  GoogleGenerativeAIFetchError: class extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  },
  SchemaType: {
    STRING: "string",
    NUMBER: "number",
    INTEGER: "integer",
    BOOLEAN: "boolean",
    ARRAY: "array",
    OBJECT: "object",
  },
}));

import { GoogleGenerativeAIFetchError } from "@google/generative-ai";
import type { ResolvedIntent } from "@/types/intent";

const VALID_INTENT: ResolvedIntent = {
  searchQuery: "comedia ligera para ver de fondo",
  excludeTerms: [],
  category: "humor",
  durationBucket: "medium",
  consumptionMode: "background",
  audience: "general",
  mood: "funny",
  language: "es",
};

let intentModule: typeof import("@/services/intent-ai");

/** Reimporta el servicio con la key configurable y caché fresca por test. */
async function loadModule() {
  vi.resetModules();
  vi.doMock("@/constants/site", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/constants/site")>();
    return { ...actual, GEMINI_API_KEY: envKey.value };
  });
  intentModule = await import("@/services/intent-ai");
}

function mockJsonResponse(intent: unknown) {
  sdkMock.generateContent.mockResolvedValue({
    response: { text: () => JSON.stringify(intent) },
  });
}

beforeEach(async () => {
  sdkMock.generateContent.mockReset();
  sdkMock.modelParamsRef.current = null;
  envKey.value = "test-key";
  await loadModule();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveIntent (capa semántica con Gemini)", () => {
  it("resuelve una intención válida pidiendo JSON forzado por la API", async () => {
    mockJsonResponse(VALID_INTENT);
    const intent = await intentModule.resolveIntent("quiero ver algo mientras como");
    expect(intent).toEqual(VALID_INTENT);
    expect(sdkMock.generateContent).toHaveBeenCalledTimes(1);
    expect(sdkMock.generateContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: 4000 })
    );
    expect(sdkMock.modelParamsRef.current).toMatchObject({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: expect.objectContaining({
          type: "object",
          required: expect.arrayContaining(["searchQuery", "consumptionMode", "audience"]),
        }),
      },
      systemInstruction: expect.stringContaining("TubePick"),
    });
  });

  it("cachea por texto normalizado: frases repetidas no vuelven a llamar al modelo", async () => {
    mockJsonResponse(VALID_INTENT);
    await intentModule.resolveIntent("quiero ver algo mientras ceno");
    await intentModule.resolveIntent("QuIeRo Ver algo mientras CENO");
    expect(sdkMock.generateContent).toHaveBeenCalledTimes(1);
  });

  it("devuelve null con JSON que no cumple el esquema (degradación silenciosa)", async () => {
    mockJsonResponse({ searchQuery: 123 }); // no cumple el schema Zod
    const intent = await intentModule.resolveIntent("una película de robots");
    expect(intent).toBeNull();
  });

  it("tolera JSON envuelto en markdown", async () => {
    sdkMock.generateContent.mockResolvedValue({
      response: { text: () => `\`\`\`json\n${JSON.stringify(VALID_INTENT)}\n\`\`\`` },
    });
    const intent = await intentModule.resolveIntent("algo para ver con historia");
    expect(intent).toEqual(VALID_INTENT);
  });

  it("cuota gratuita agotada (HTTP 429): devuelve null, degrada y lo anota en logs", async () => {
    sdkMock.generateContent.mockRejectedValue(
      new GoogleGenerativeAIFetchError("API limit reached", 429)
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const intent = await intentModule.resolveIntent("algo para ver con amigos");
    expect(intent).toBeNull();
    expect(intentModule.fallbackStats.quotaFallbacks).toBe(1);
    expect(intentModule.fallbackStats.totalFallbacks).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cuota gratuita de Gemini agotada")
    );
    warnSpy.mockRestore();
  });

  it("error genérico de red: devuelve null sin contar como cuota", async () => {
    sdkMock.generateContent.mockRejectedValue(new Error("ECONNRESET"));
    const intent = await intentModule.resolveIntent("algo para ver mañana");
    expect(intent).toBeNull();
    expect(intentModule.fallbackStats.quotaFallbacks).toBe(0);
    expect(intentModule.fallbackStats.totalFallbacks).toBe(1);
  });

  it("devuelve null para queries vacías sin llamar al modelo", async () => {
    mockJsonResponse(VALID_INTENT);
    const intent = await intentModule.resolveIntent("   ");
    expect(intent).toBeNull();
    expect(sdkMock.generateContent).not.toHaveBeenCalled();
  });

  it("respeta restricciones de consumo y familia en la caché", async () => {
    mockJsonResponse(VALID_INTENT);
    await intentModule.resolveIntent("algo para ver más tarde", { consumption: "focused" });
    await intentModule.resolveIntent("algo para ver más tarde", { consumption: "background" });
    expect(sdkMock.generateContent).toHaveBeenCalledTimes(2);
  });

  it("registra estadísticas de uso (IA real vs caché)", async () => {
    mockJsonResponse(VALID_INTENT);
    await intentModule.resolveIntent("algo entretenido para ver");
    expect(intentModule.intentStats.aiResolves).toBe(1);
    expect(intentModule.intentStats.cacheHits).toBe(0);

    await intentModule.resolveIntent("ALGO entretenido para VER");
    expect(intentModule.intentStats.aiResolves).toBe(1);
    expect(intentModule.intentStats.cacheHits).toBe(1);
  });

  it("sin GEMINI_API_KEY lanza error de configuración claro (falla temprano)", async () => {
    envKey.value = "";
    await loadModule();
    await expect(intentModule.resolveIntent("algo para ver")).rejects.toThrow(
      intentModule.IntentConfigError
    );
    await expect(intentModule.resolveIntent("algo para ver")).rejects.toThrow(/GEMINI_API_KEY/);
    expect(sdkMock.generateContent).not.toHaveBeenCalled();
  });
});

describe("parseIntent", () => {
  it("acepta JSON puro", () => {
    expect(intentModule.parseIntent(JSON.stringify(VALID_INTENT))).toEqual(VALID_INTENT);
  });

  it("rechaza texto no-JSON", () => {
    expect(intentModule.parseIntent("lo siento, no puedo responder")).toBeNull();
  });

  it("rechaza categorías inválidas", () => {
    const broken = { ...VALID_INTENT, category: "peces" };
    expect(intentModule.parseIntent(JSON.stringify(broken))).toBeNull();
  });

  it("rechaza consumptionMode inválido", () => {
    const broken = { ...VALID_INTENT, consumptionMode: "procrastinating" };
    expect(intentModule.parseIntent(JSON.stringify(broken))).toBeNull();
  });
});
