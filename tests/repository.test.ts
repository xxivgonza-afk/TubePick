import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/youtube-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/youtube-api")>();
  return {
    ...actual,
    callYouTubeApi: vi.fn(),
  };
});

import { callYouTubeApi, YouTubeApiError } from "@/services/youtube-api";
import type { NormalizedSearchParams } from "@/types/search";

const searchItems = [
  {
    id: { videoId: "video-1" },
    snippet: {
      publishedAt: "2026-01-01T00:00:00Z",
      channelId: "channel-1",
      channelTitle: "Canal Uno",
      title: "Video de prueba",
      description: "Descripción",
      thumbnails: {
        high: { url: "https://i.ytimg.com/vi/video-1/hqdefault.jpg", width: 480, height: 360 },
      },
    },
  },
];

const videoItems = [
  {
    id: "video-1",
    snippet: searchItems[0].snippet,
    contentDetails: { duration: "PT10M30S" },
    statistics: { viewCount: "1234" },
  },
];

const comidaParams: NormalizedSearchParams = {
  keywords: ["recetas fáciles"],
  category: "comida",
  order: "relevance",
  maxResults: 24,
};

const otrasParams: NormalizedSearchParams = {
  keywords: ["pasta"],
  category: "comida",
  order: "relevance",
  maxResults: 24,
};

function mockSuccessfulApi() {
  const mock = vi.mocked(callYouTubeApi);
  mock.mockReset();
  mock.mockImplementation(async ({ path }) =>
    path === "search" ? { items: searchItems } : { items: videoItems }
  );
  return mock;
}

let repository: typeof import("@/repositories/youtube");

beforeEach(async () => {
  vi.resetModules();
  repository = await import("@/repositories/youtube");
  mockSuccessfulApi();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchVideos (repository)", () => {
  it("mapea la respuesta de la API a videos enriquecidos", async () => {
    const { videos, fromFallback } = await repository.searchVideos(comidaParams);
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      id: "video-1",
      title: "Video de prueba",
      channelTitle: "Canal Uno",
      durationSeconds: 630,
      viewCount: 1234,
      thumbnailUrl: "https://i.ytimg.com/vi/video-1/hqdefault.jpg",
    });
    expect(fromFallback).toBeUndefined();
    expect(vi.mocked(callYouTubeApi)).toHaveBeenCalledTimes(2);
  });

  it("sirve el cache exacto sin volver a llamar a la API", async () => {
    await repository.searchVideos(comidaParams);
    expect(vi.mocked(callYouTubeApi)).toHaveBeenCalledTimes(2);

    const { videos } = await repository.searchVideos(comidaParams);
    expect(videos).toHaveLength(1);
    expect(vi.mocked(callYouTubeApi)).toHaveBeenCalledTimes(2);
  });

  it("ante cuota agotada degrada con la caché de la categoría y marca fromFallback", async () => {
    await repository.searchVideos(comidaParams);
    vi.mocked(callYouTubeApi).mockRejectedValue(
      new YouTubeApiError("quota", "Se agotó la cuota diaria de la API de YouTube.")
    );

    const { videos, fromFallback } = await repository.searchVideos(otrasParams);
    expect(fromFallback).toBe(true);
    expect(videos[0].id).toBe("video-1");
  });

  it("propaga el error de cuota si no hay caché de categoría", async () => {
    vi.mocked(callYouTubeApi).mockRejectedValue(
      new YouTubeApiError("quota", "Se agotó la cuota diaria de la API de YouTube.")
    );

    await expect(repository.searchVideos(comidaParams)).rejects.toThrow(
      "Se agotó la cuota diaria"
    );
  });

  it("propaga los errores que no son de cuota sin degradar", async () => {
    vi.mocked(callYouTubeApi).mockRejectedValue(
      new YouTubeApiError("network", "No se pudo contactar con YouTube.")
    );

    await expect(repository.searchVideos(comidaParams)).rejects.toThrow(
      "No se pudo contactar con YouTube."
    );
  });

  it("filtra post-captura los videos que contienen términos excluidos (incl. plurales)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            {
              id: { videoId: "video-2" },
              snippet: {
                ...searchItems[0].snippet,
                title: "Top 10 Fantasmas inquietantes",
              },
            },
            {
              id: { videoId: "video-3" },
              snippet: {
                ...searchItems[0].snippet,
                title: "Fantasma Real molesta a este pequeño",
              },
            },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: {
              ...searchItems[0].snippet,
              title: "Top 10 Fantasmas inquietantes",
            },
            contentDetails: { duration: "PT3M" },
            statistics: { viewCount: "99" },
          },
          {
            id: "video-3",
            snippet: {
              ...searchItems[0].snippet,
              title: "Fantasma Real molesta a este pequeño",
            },
            contentDetails: { duration: "PT1M" },
            statistics: { viewCount: "10" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["terror", "-fantasmas"],
      category: "terror",
      order: "relevance",
      maxResults: 24,
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");
  });

  it("filtra shorts por duración (videoType='video')", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            { id: { videoId: "video-2" }, snippet: searchItems[0].snippet },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: searchItems[0].snippet,
            contentDetails: { duration: "PT45S" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["terror"],
      category: "terror",
      order: "relevance",
      maxResults: 24,
      videoType: "video",
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");
  });

  it("con videoType='short' solo quedan los videos de <= 60 s", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            { id: { videoId: "video-2" }, snippet: searchItems[0].snippet },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: searchItems[0].snippet,
            contentDetails: { duration: "PT45S" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["terror"],
      category: "terror",
      order: "relevance",
      maxResults: 24,
      videoType: "short",
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-2");
  });

  it("no comparte caché entre videoType distintos (regresión)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            { id: { videoId: "video-2" }, snippet: searchItems[0].snippet },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: searchItems[0].snippet,
            contentDetails: { duration: "PT45S" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const base = {
      keywords: ["terror"],
      category: "terror" as const,
      order: "relevance" as const,
      maxResults: 24,
    };

    const shorts = await repository.searchVideos({ ...base, videoType: "short" });
    expect(shorts.videos.map((v) => v.id)).toEqual(["video-2"]);

    const longs = await repository.searchVideos({ ...base, videoType: "video" });
    expect(longs.videos.map((v) => v.id)).toEqual(["video-1"]);
  });

  it("el fallback por cuota NO sirve datos cacheados de otro videoType (evita contaminar)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            { id: { videoId: "video-2" }, snippet: searchItems[0].snippet },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: searchItems[0].snippet,
            contentDetails: { duration: "PT45S" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const base = {
      keywords: ["terror"],
      category: "terror" as const,
      order: "relevance" as const,
      maxResults: 24,
    };

    await repository.searchVideos({ ...base, videoType: "video" });

    vi.mocked(callYouTubeApi).mockRejectedValue(
      new YouTubeApiError("quota", "Se agotó la cuota diaria de la API de YouTube.")
    );

    // Con videoType distinto, la caché de categoría no aplica: propaga el error.
    await expect(repository.searchVideos({ ...base, videoType: "short" })).rejects.toThrow(
      "Se agotó la cuota diaria"
    );

    // Con el mismo videoType (y otra query), el fallback sí sirve la caché
    // y aplica el filtro de shorts al leerla.
    const { videos, fromFallback } = await repository.searchVideos({
      ...base,
      keywords: ["terror alternativo"],
      videoType: "video",
    });
    expect(fromFallback).toBe(true);
    expect(videos.map((v) => v.id)).toEqual(["video-1"]);
  });

  it("cuenta como short un video de <= 3 min con tag #shorts", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            {
              id: { videoId: "video-2" },
              snippet: { ...searchItems[0].snippet, description: "Mira este #shorts" },
            },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: { ...searchItems[0].snippet, description: "Mira este #shorts" },
            contentDetails: { duration: "PT2M30S" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["terror"],
      category: "terror",
      order: "relevance",
      maxResults: 24,
      videoType: "video",
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");
  });

  it("excluye contenido infantil por defecto cuando el usuario no pide familia", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            {
              id: { videoId: "video-2" },
              snippet: {
                ...searchItems[0].snippet,
                title: "Canta con los bebés: canciones infantiles",
              },
            },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: { ...searchItems[0].snippet, title: "Canta con los bebés: canciones infantiles" },
            contentDetails: { duration: "PT5M" },
            statistics: { viewCount: "50" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["musica"],
      category: "musica",
      order: "relevance",
      maxResults: 24,
      excludeChildContent: true,
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");
  });

  it("sin excludeChildContent no toca los resultados (familia explícita)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            {
              id: { videoId: "video-2" },
              snippet: {
                ...searchItems[0].snippet,
                title: "Canta con los bebés: canciones infantiles",
              },
            },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: { ...searchItems[0].snippet, title: "Canta con los bebés: canciones infantiles" },
            contentDetails: { duration: "PT5M" },
            statistics: { viewCount: "50" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["musica"],
      category: "musica",
      order: "relevance",
      maxResults: 24,
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(2);
  });

  it("aplica el rango de duración personalizado post-captura", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            { id: { videoId: "video-2" }, snippet: searchItems[0].snippet },
          ],
        };
      }
      return {
        items: [
          videoItems[0], // 10 min 30 s
          {
            id: "video-2",
            snippet: searchItems[0].snippet,
            contentDetails: { duration: "PT2M" },
            statistics: { viewCount: "500" },
          },
        ],
      };
    });

    const params: NormalizedSearchParams = {
      keywords: ["gta"],
      category: "gaming",
      order: "relevance",
      maxResults: 24,
      durationMinSeconds: 300,
      durationMaxSeconds: 900,
    };

    const { videos } = await repository.searchVideos(params);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");
  });

  it("con videoType='live' pide eventType=live a la API", async () => {
    await repository.searchVideos({
      keywords: ["gta"],
      category: "gaming",
      order: "relevance",
      maxResults: 24,
      videoType: "live",
    });
    const searchCall = vi.mocked(callYouTubeApi).mock.calls.find(([options]) => options.path === "search");
    expect(searchCall?.[0].params.eventType).toBe("live");
  });

  it("envía videoCategoryId a la API cuando el filtro de categoría está explícito", async () => {
    await repository.searchVideos({
      keywords: ["recetas fáciles"],
      category: "comida",
      videoCategoryId: 26,
      order: "relevance",
      maxResults: 24,
    });
    const searchCall = vi.mocked(callYouTubeApi).mock.calls.find(([options]) => options.path === "search");
    expect(searchCall?.[0].params.videoCategoryId).toBe(26);
  });

  it("no envía videoDuration cuando videoType='live' (los directos duran horas)", async () => {
    await repository.searchVideos({
      keywords: ["gta"],
      category: "gaming",
      duration: "short",
      order: "relevance",
      maxResults: 24,
      videoType: "live",
    });
    const searchCall = vi.mocked(callYouTubeApi).mock.calls.find(([options]) => options.path === "search");
    expect(searchCall?.[0].params.videoDuration).toBeUndefined();
    expect(searchCall?.[0].params.eventType).toBe("live");
  });

  it("no envía videoDuration cuando videoType='short' (el bucket inferido vaciaría los shorts)", async () => {
    await repository.searchVideos({
      keywords: ["cocina recetas"],
      category: "comida",
      duration: "medium",
      order: "relevance",
      maxResults: 24,
      videoType: "short",
    });
    const searchCall = vi.mocked(callYouTubeApi).mock.calls.find(([options]) => options.path === "search");
    expect(searchCall?.[0].params.videoDuration).toBeUndefined();
    expect(searchCall?.[0].params.eventType).toBeUndefined();
  });

  it("si la categoría de YouTube vacía los resultados, relaja soltándola", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path, params }) => {
      if (path === "search") {
        const category = String(params.videoCategoryId ?? "");
        if (category === "23") return { items: [] }; // humor: sin resultados
        return { items: [{ id: { videoId: "video-1" }, snippet: searchItems[0].snippet }] };
      }
      return { items: [videoItems[0]] };
    });

    const { videos, relaxed } = await repository.searchVideos({
      keywords: ["sketch"],
      category: "humor",
      videoCategoryId: 23,
      order: "relevance",
      maxResults: 24,
    });
    expect(relaxed).toBe(true);
    expect(videos).toHaveLength(1);
    // La variante relajada pidió a la API sin videoCategoryId.
    const calls = mock.mock.calls
      .filter(([options]) => options.path === "search")
      .map(([options]) => options.params.videoCategoryId);
    expect(calls).toContain(23);
    expect(calls).toContain(undefined);
  });

  it("excluye por palabra con stemming y sin acentos (sin falsos positivos)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path }) => {
      if (path === "search") {
        return {
          items: [
            { id: { videoId: "video-1" }, snippet: searchItems[0].snippet },
            {
              id: { videoId: "video-2" },
              snippet: { ...searchItems[0].snippet, title: "Casablanca, la película" },
            },
            {
              id: { videoId: "video-3" },
              snippet: { ...searchItems[0].snippet, title: "Los fantasmas del castillo" },
            },
            {
              id: { videoId: "video-4" },
              snippet: { ...searchItems[0].snippet, channelTitle: "El Niño Robot" },
            },
          ],
        };
      }
      return {
        items: [
          videoItems[0],
          {
            id: "video-2",
            snippet: { ...searchItems[0].snippet, title: "Casablanca, la película" },
            contentDetails: { duration: "PT1H40M" },
            statistics: { viewCount: "1" },
          },
          {
            id: "video-3",
            snippet: { ...searchItems[0].snippet, title: "Los fantasmas del castillo" },
            contentDetails: { duration: "PT5M" },
            statistics: { viewCount: "2" },
          },
          {
            id: "video-4",
            snippet: { ...searchItems[0].snippet, channelTitle: "El Niño Robot" },
            contentDetails: { duration: "PT5M" },
            statistics: { viewCount: "3" },
          },
        ],
      };
    });

    const { videos } = await repository.searchVideos({
      keywords: ["terror", "-casas", "-fantasma", "-nino"],
      category: "terror",
      order: "relevance",
      maxResults: 24,
    });
    // "Casablanca" NO matchea "casas" (queda); "fantasmas" matchea
    // "fantasma"; "nino" (sin acento) matchea "Niño".
    expect(videos.map((v) => v.id)).toEqual(["video-1", "video-2"]);
  });

  it("si la consulta estricta queda vacía, relaja la query y devuelve resultados", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path, params }) => {
      if (path === "search") {
        const q = String(params.q ?? "");
        if (q.includes("-kids")) return { items: [] }; // query sobreexigida: vacía
        return { items: [{ id: { videoId: "video-1" }, snippet: searchItems[0].snippet }] };
      }
      return { items: [videoItems[0]] };
    });

    const params: NormalizedSearchParams = {
      keywords: ["vlog de viajes", "-luisito comunica", "-clavero", "-kids", "-niños"],
      category: "documentales",
      order: "relevance",
      maxResults: 24,
      excludeChildContent: true,
    };

    const { videos, relaxed } = await repository.searchVideos(params);
    expect(relaxed).toBe(true);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe("video-1");

    // El reintento quitó SOLO las exclusiones automáticas infantiles:
    // las del usuario ("que no sean ellos") se conservan en la query.
    const relaxedCalls = mock.mock.calls
      .filter(([options]) => options.path === "search")
      .map(([options]) => String(options.params.q ?? ""))
      .filter((q) => !q.includes("-kids"));
    expect(relaxedCalls).toHaveLength(1);
    expect(relaxedCalls[0]).toContain("-luisito comunica");
    expect(relaxedCalls[0]).toContain("-clavero");
  });

  it("si ni relajando hay resultados, devuelve vacío sin error", async () => {
    mockSuccessfulApi().mockImplementation(async ({ path }) => {
      return path === "search" ? { items: [] } : { items: [] };
    });

    const { videos, relaxed } = await repository.searchVideos({
      keywords: ["zzzzz"],
      category: null,
      order: "relevance",
      maxResults: 24,
    });
    expect(videos).toHaveLength(0);
    expect(relaxed).toBeUndefined();
  });

  it("las variantes relajadas usan su propia caché (no rellaman a la API)", async () => {
    const mock = mockSuccessfulApi();
    mock.mockImplementation(async ({ path, params }) => {
      if (path === "search") {
        const q = String(params.q ?? "");
        if (q.includes("-kids")) return { items: [] };
        return { items: [{ id: { videoId: "video-1" }, snippet: searchItems[0].snippet }] };
      }
      return { items: [videoItems[0]] };
    });

    const params: NormalizedSearchParams = {
      keywords: ["vlog de viajes", "-kids", "-niños"],
      category: "documentales",
      order: "relevance",
      maxResults: 24,
      excludeChildContent: true,
    };

    await repository.searchVideos(params);
    const callsAfterFirst = vi.mocked(callYouTubeApi).mock.calls.length;

    const second = await repository.searchVideos(params);
    expect(second.relaxed).toBe(true);
    expect(second.videos).toHaveLength(1);
    expect(vi.mocked(callYouTubeApi).mock.calls.length).toBe(callsAfterFirst);
  });
});
