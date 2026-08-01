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
      videoType: "video",
      consumption: "background",
      family: "1",
      durationMin: "5",
      durationMax: "60",
    });
    expect(filters).toEqual({
      q: "algo divertido",
      category: "humor",
      duration: "medium",
      language: "es",
      date: "month",
      order: "views",
      videoType: "video",
      consumption: "background",
      family: true,
      durationMin: 5,
      durationMax: 60,
    });
  });

  it("descarta un videoType inválido", () => {
    expect(parseSearchFilters({ videoType: "pelicula" }).videoType).toBeUndefined();
    expect(parseSearchFilters({ videoType: "short" }).videoType).toBe("short");
    expect(parseSearchFilters({ videoType: "live" }).videoType).toBe("live");
  });

  it("descarta un consumo inválido", () => {
    expect(parseSearchFilters({ consumption: "dormido" }).consumption).toBeUndefined();
    expect(parseSearchFilters({ consumption: "focused" }).consumption).toBe("focused");
  });

  it("family solo se activa con el literal '1'", () => {
    expect(parseSearchFilters({ family: "1" }).family).toBe(true);
    expect(parseSearchFilters({ family: "si" }).family).toBeUndefined();
  });

  it("sorpresa solo se activa con el literal '1'", () => {
    expect(parseSearchFilters({ sorpresa: "1" }).sorpresa).toBe(true);
    expect(parseSearchFilters({ sorpresa: "si" }).sorpresa).toBeUndefined();
    expect(buildSearchUrl({ q: "", language: "both", sorpresa: true })).toBe("/search?sorpresa=1");
  });

  it("descarta un rango de duración fuera de los límites (filtro ausente)", () => {
    expect(parseSearchFilters({ durationMin: "0", durationMax: "500" })).toMatchObject({
      durationMin: undefined,
      durationMax: undefined,
    });
  });

  it("un rango invertido (min > max) se interpreta intercambiado, nunca vacío", () => {
    expect(parseSearchFilters({ durationMin: "60", durationMax: "10" })).toMatchObject({
      durationMin: 10,
      durationMax: 60,
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
      videoType: "short",
      consumption: "background",
      family: true,
      durationMin: 5,
      durationMax: 60,
    });
    expect(url).toBe(
      "/search?q=quiero+algo+para+comer&category=comida&duration=short&language=es&date=week&order=newest&videoType=short&consumption=background&family=1&durationMin=5&durationMax=60"
    );
  });

  it("omite videoType 'all' de la URL", () => {
    expect(buildSearchUrl({ q: "gta", language: "both", videoType: "all" })).toBe("/search?q=gta");
  });

  it("round-trip: parse(build(filters)) == filters", () => {
    const filters = {
      q: "gta",
      category: "gaming" as const,
      duration: "long" as const,
      language: "both" as const,
      date: "year" as const,
      order: "views" as const,
      videoType: "video" as const,
      consumption: "background" as const,
      family: true,
      durationMin: 10,
      durationMax: 90,
    };
    const url = buildSearchUrl(filters);
    expect(parseSearchFilters(Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? "")))).toEqual(filters);
  });
});
