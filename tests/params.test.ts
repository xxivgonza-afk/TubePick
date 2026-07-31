import { describe, expect, it } from "vitest";
import { buildSearchUrl, parseSearchFilters } from "@/features/search/params";

describe("parseSearchFilters", () => {
  it("aplica defaults", () => {
    const filters = parseSearchFilters({});
    expect(filters).toEqual({ q: "", language: "both" });
  });

  it("parsea todos los parámetros válidos", () => {
    const filters = parseSearchFilters({
      q: "algo divertido",
      category: "humor",
      duration: "medium",
      language: "es",
      date: "month",
      order: "views",
    });
    expect(filters).toEqual({
      q: "algo divertido",
      category: "humor",
      duration: "medium",
      language: "es",
      date: "month",
      order: "views",
    });
  });

  it("descarta valores inválidos y toma el primer valor de arrays", () => {
    const filters = parseSearchFilters({
      q: ["uno", "dos"],
      duration: "interminable",
      category: ["ciencia", "humor"],
      language: "xx",
    });
    expect(filters.q).toBe("uno");
    expect(filters.duration).toBeUndefined();
    expect(filters.category).toBe("ciencia");
    expect(filters.language).toBe("both");
  });

  it("limita la longitud de la query", () => {
    const filters = parseSearchFilters({ q: "x".repeat(500) });
    expect(filters.q.length).toBeLessThanOrEqual(200);
  });
});

describe("buildSearchUrl", () => {
  it("omite los filtros sin valor", () => {
    expect(buildSearchUrl({ q: "", language: "both" })).toBe("/search");
  });

  it("construye la URL canónica", () => {
    const url = buildSearchUrl({
      q: "quiero algo para comer",
      category: "comida",
      duration: "short",
      language: "es",
      date: "week",
      order: "newest",
    });
    expect(url).toBe("/search?q=quiero+algo+para+comer&category=comida&duration=short&language=es&date=week&order=newest");
  });

  it("round-trip: parse(build(filters)) == filters", () => {
    const filters = {
      q: "gta",
      category: "gaming" as const,
      duration: "long" as const,
      language: "both" as const,
      date: "year" as const,
      order: "views" as const,
    };
    const url = buildSearchUrl(filters);
    expect(parseSearchFilters(Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? "")))).toEqual(filters);
  });
});
