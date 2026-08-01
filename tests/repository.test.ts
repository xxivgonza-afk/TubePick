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

  it("el fallback por cuota aplica el videoType pedido aunque cambie respecto al cacheado", async () => {
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

    const { videos, fromFallback } = await repository.searchVideos({ ...base, videoType: "short" });
    expect(fromFallback).toBe(true);
    expect(videos.map((v) => v.id)).toEqual(["video-2"]);
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
});
