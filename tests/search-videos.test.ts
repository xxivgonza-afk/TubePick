import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/intent-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/intent-ai")>();
  return {
    ...actual,
    resolveIntent: vi.fn(),
  };
});

vi.mock("@/repositories/youtube", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/repositories/youtube")>();
  return {
    ...actual,
    searchVideos: vi.fn(),
  };
});

import { resolveIntent } from "@/services/intent-ai";
import { searchVideos } from "@/repositories/youtube";
import { searchVideos as searchVideosOrchestrator } from "@/features/search/search-videos";
import type { ResolvedIntent } from "@/types/intent";
import type { Video } from "@/types/video";

const base = { q: "", language: "both" as const };

const mockVideo: Video = {
  id: "video-1",
  title: "Video de prueba",
  channelId: "channel-1",
  channelTitle: "Canal Uno",
  description: "",
  thumbnailUrl: "https://i.ytimg.com/vi/video-1/hqdefault.jpg",
  thumbnailWidth: 480,
  thumbnailHeight: 360,
  publishedAt: "2026-01-01T00:00:00Z",
  durationSeconds: 630,
  viewCount: 100,
};

/** Los casos de prueba obligatorios del motor semántico. */
const CASES: Array<{ query: string; intent: ResolvedIntent; label: string }> = [
  {
    label: "mientras como",
    query: "quiero ver algo mientras como",
    intent: {
      searchQuery: "comedia ligera para ver de fondo",
      excludeTerms: [],
      category: "humor",
      durationBucket: "medium",
      consumptionMode: "background",
      audience: "general",
      mood: "funny",
      language: "es",
    },
  },
  {
    label: "mientras trabajo",
    query: "algo para ver mientras trabajo",
    intent: {
      searchQuery: "podcast o charla interesante de fondo",
      excludeTerms: [],
      category: "podcasts",
      durationBucket: "medium",
      consumptionMode: "background",
      audience: "general",
      mood: "informative",
      language: "es",
    },
  },
  {
    label: "documental con atención",
    query: "documental de historia para ver con atención",
    intent: {
      searchQuery: "documental de historia completo",
      excludeTerms: [],
      category: "documentales",
      durationBucket: "long",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    },
  },
  {
    label: "para mi hijo",
    query: "algo para mi hijo de 5 años",
    intent: {
      searchQuery: "dibujos animados educativos para niños de 5 años",
      excludeTerms: [],
      category: null,
      durationBucket: "short",
      consumptionMode: "background",
      audience: "family",
      mood: "funny",
      language: "es",
    },
  },
  {
    label: "aprender react",
    query: "quiero aprender React",
    intent: {
      searchQuery: "tutorial de React para principiantes",
      excludeTerms: [],
      category: "programacion",
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    },
  },
];

beforeEach(() => {
  vi.mocked(resolveIntent).mockReset();
  vi.mocked(searchVideos).mockReset();
  vi.mocked(searchVideos).mockResolvedValue({ videos: [mockVideo] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchVideos (orquestación IA → reglas)", () => {
  it.each(CASES.map((c) => [c.label, c] as const))(
    "caso obligatorio '%s': usa la intención de la IA y no rompe",
    async (_label, { query, intent }) => {
      vi.mocked(resolveIntent).mockResolvedValue(intent);
      const outcome = await searchVideosOrchestrator({ ...base, q: query });
      expect(outcome.intentSource).toBe("ai");
      expect(outcome.error).toBeUndefined();
      expect(outcome.videos).toHaveLength(1);
    }
  );

  it("'mientras como' produce consumo pasivo y excluye contenido infantil", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[0].intent);
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[0].query });
    expect(outcome.params.keywords).toContain("comedia");
    expect(outcome.params.keywords.some((k) => k.startsWith("-kids") || k.startsWith("-niños"))).toBe(true);
    expect(outcome.params.excludeChildContent).toBe(true);
  });

  it("'para mi hijo de 5 años' permite contenido familiar", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[3].intent);
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[3].query });
    expect(outcome.params.excludeChildContent).toBeUndefined();
    expect(outcome.params.keywords.some((k) => k.startsWith("-kids"))).toBe(false);
  });

  it("'aprender react' conserva la categoría y la query útil", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[4].intent);
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[4].query });
    expect(outcome.params.category).toBe("programacion");
    expect(outcome.params.keywords).toContain("React".length && "tutorial");
  });

  it("el filtro family explícito del usuario gana a la intención", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[0].intent); // general
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[0].query, family: true });
    expect(outcome.params.excludeChildContent).toBeUndefined();
  });

  it("la duración explícita de la UI gana al bucket de la IA", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[2].intent); // long
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[2].query, duration: "short" });
    expect(outcome.params.duration).toBe("short");
  });

  it("la categoría explícita del usuario llega a la API como videoCategoryId", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[4].intent); // programacion inferida
    const outcome = await searchVideosOrchestrator({
      ...base,
      q: CASES[4].query,
      category: "humor",
    });
    expect(outcome.params.category).toBe("humor");
    expect(outcome.params.videoCategoryId).toBe(23);
  });

  it("la categoría inferida por la IA NO se impone como videoCategoryId (evita vaciar resultados)", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[4].intent); // programacion inferida
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[4].query });
    expect(outcome.params.category).toBe("programacion");
    expect(outcome.params.videoCategoryId).toBeUndefined();
  });

  it("el rango de duración personalizado se traduce a segundos", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[2].intent);
    const outcome = await searchVideosOrchestrator({
      ...base,
      q: CASES[2].query,
      durationMin: 10,
      durationMax: 20,
    });
    expect(outcome.params.durationMinSeconds).toBe(600);
    expect(outcome.params.durationMaxSeconds).toBe(1200);
  });

  it("sin IA (resolveIntent null) degrada a reglas sin error para el usuario", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(null);
    const outcome = await searchVideosOrchestrator({ ...base, q: "quiero algo para comer" });
    expect(outcome.intentSource).toBe("rules");
    expect(outcome.error).toBeUndefined();
    expect(outcome.params.category).toBe("comida");
  });

  it("sin GEMINI_API_KEY muestra error de configuración claro, no rompe", async () => {
    const { IntentConfigError } = await import("@/services/intent-ai");
    vi.mocked(resolveIntent).mockRejectedValue(
      new IntentConfigError("Falta la variable de entorno GEMINI_API_KEY.")
    );
    const outcome = await searchVideosOrchestrator({ ...base, q: "algo para ver" });
    expect(outcome.error).toMatchObject({ kind: "config", configKey: "gemini" });
  });

  it("propaga la relajación de query del repository", async () => {
    vi.mocked(resolveIntent).mockResolvedValue(CASES[0].intent);
    vi.mocked(searchVideos).mockResolvedValue({ videos: [mockVideo], relaxed: true });
    const outcome = await searchVideosOrchestrator({ ...base, q: CASES[0].query });
    expect(outcome.relaxed).toBe(true);
  });

  it("explora una categoría sin texto con la IA (frase de exploración)", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "lo ultimo tecnologia",
      excludeTerms: [],
      category: "tecnologia",
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    });
    const outcome = await searchVideosOrchestrator({ ...base, category: "tecnologia" });
    expect(outcome.intentSource).toBe("ai");
    expect(vi.mocked(resolveIntent)).toHaveBeenCalledWith(
      "muéstrame contenido interesante de Tecnología",
      expect.anything()
    );
  });

  it("sin texto ni categoría también usa la IA (descubrimiento genérico)", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "videos populares interesantes",
      excludeTerms: [],
      category: null,
      durationBucket: null,
      consumptionMode: "background",
      audience: "general",
      mood: null,
      language: "es",
    });
    const outcome = await searchVideosOrchestrator({ ...base, q: "" });
    expect(outcome.intentSource).toBe("ai");
    expect(vi.mocked(resolveIntent)).toHaveBeenCalledWith(
      "contenido interesante y variado de YouTube para ver ahora",
      expect.anything()
    );
  });

  it("modo sorpresa: la IA elige el tema sin contexto (usuario nuevo)", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "expediciones a las profundidades del océano",
      excludeTerms: [],
      category: "ciencia",
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    });
    const outcome = await searchVideosOrchestrator({ ...base, sorpresa: true });
    expect(outcome.intentSource).toBe("ai");
    expect(outcome.surpriseTopic).toBe("expediciones a las profundidades del océano");
    expect(vi.mocked(resolveIntent).mock.calls[0][0]).toContain("sorpréndeme");
    expect(vi.mocked(resolveIntent).mock.calls[0][0]).toContain("poco común");
  });

  it("modo sorpresa: el texto escrito es el ancla (gana a la señal local)", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "coches clásicos restaurados",
      excludeTerms: [],
      category: null,
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: null,
      language: "es",
    });
    await searchVideosOrchestrator(
      { ...base, q: "coches clásicos", sorpresa: true },
      { userTerms: ["react", "minecraft"], visits: 4 }
    );
    const prompt = vi.mocked(resolveIntent).mock.calls[0][0];
    expect(prompt).toContain("coches clásicos");
    expect(prompt).toContain("NUEVO");
    expect(prompt).toContain("usuario habitual");
    expect(prompt).not.toContain("minecraft");
  });

  it("modo sorpresa: con intereses del usuario, afina y evita repetir", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "documentales de construcción en el Ártico",
      excludeTerms: [],
      category: "documentales",
      durationBucket: "long",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    });
    const outcome = await searchVideosOrchestrator(
      { ...base, sorpresa: true },
      { userTerms: ["react", "minecraft", "comedia"], visits: 4 }
    );
    expect(outcome.surpriseTopic).toBe("documentales de construcción en el Ártico");
    const prompt = vi.mocked(resolveIntent).mock.calls[0][0];
    expect(prompt).toContain("react, minecraft, comedia");
    expect(prompt).toContain("NUEVO");
    expect(prompt).toContain("usuario habitual");
  });

  it("modo sorpresa: cada sorpresa es única, nunca usa la caché de intención", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "coches clásicos restaurados",
      excludeTerms: [],
      category: null,
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: null,
      language: "es",
    });
    await searchVideosOrchestrator({ ...base, sorpresa: true });
    expect(vi.mocked(resolveIntent).mock.calls[0][1]).toMatchObject({ noCache: true });
  });

  it("modo sorpresa con pocas visitas no presume de usuario habitual", async () => {
    vi.mocked(resolveIntent).mockResolvedValue({
      searchQuery: "datos curiosos de la antigua Roma",
      excludeTerms: [],
      category: "historia",
      durationBucket: "medium",
      consumptionMode: "focused",
      audience: "general",
      mood: "informative",
      language: "es",
    });
    await searchVideosOrchestrator(
      { ...base, sorpresa: true },
      { userTerms: ["roma"], visits: 1 }
    );
    const prompt = vi.mocked(resolveIntent).mock.calls[0][0];
    expect(prompt).toContain("roma");
    expect(prompt).not.toContain("usuario habitual");
  });
});
