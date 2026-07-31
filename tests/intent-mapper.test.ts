import { describe, expect, it } from "vitest";
import { mapIntent, normalizeText } from "@/services/intent-mapper";
import type { SearchFilters } from "@/types/search";

const base: SearchFilters = { q: "", language: "both" };

describe("mapIntent", () => {
  it("detecta categoría 'comida' y cae al seed sin términos propios", () => {
    const params = mapIntent({ ...base, q: "quiero algo para comer" });
    expect(params.category).toBe("comida");
    expect(params.keywords).toEqual(["recetas fáciles"]);
  });

  it("detecta 'podcast' como categoría y duración media", () => {
    const params = mapIntent({ ...base, q: "un podcast interesante" });
    expect(params.category).toBe("podcasts");
    expect(params.duration).toBe("medium");
  });

  it("conserva términos específicos de la categoría ('aprender react')", () => {
    const params = mapIntent({ ...base, q: "aprender react" });
    expect(params.category).toBe("programacion");
    expect(params.keywords).toEqual(["aprender", "react"]);
  });

  it("mezcla palabras propias con el término disparador ('historias de terror de madrugada')", () => {
    const params = mapIntent({ ...base, q: "historias de terror de madrugada" });
    expect(params.category).toBe("terror");
    expect(params.keywords).toEqual(["historias", "madrugada", "terror"]);
  });

  it("descarta verbos genéricos de intención ('quiero jugar algo con mi hermano')", () => {
    const params = mapIntent({ ...base, q: "quiero jugar algo con mi hermano" });
    expect(params.category).toBe("gaming");
    expect(params.keywords).toEqual(["hermano"]);
  });

  it("detecta idioma desde el texto", () => {
    expect(mapIntent({ ...base, q: "las noticias en espanol" }).language).toBe("es");
    expect(mapIntent({ ...base, q: "some videos in english" }).language).toBe("en");
  });

  it("detecta orden desde el texto", () => {
    expect(mapIntent({ ...base, q: "los videos mas vistos de futbol" }).order).toBe("viewCount");
    expect(mapIntent({ ...base, q: "algo reciente" }).order).toBe("date");
  });

  it("detecta duración desde el texto", () => {
    expect(mapIntent({ ...base, q: "algo rapido de ver" }).duration).toBe("short");
    expect(mapIntent({ ...base, q: "un documental largo" }).duration).toBe("long");
  });

  it("la categoría explícita de la UI gana a la inferida", () => {
    const params = mapIntent({ ...base, q: "algo gracioso", category: "ciencia" });
    expect(params.category).toBe("ciencia");
  });

  it("el filtro de fecha genera publishedAfter de 7 días", () => {
    const params = mapIntent({ ...base, date: "week" });
    const expected = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    expect(params.publishedAfter?.slice(0, 10)).toBe(expected);
  });

  it("sin query ni categoría usa un seed por defecto", () => {
    expect(mapIntent(base).keywords).toEqual(["viral"]);
  });

  it("con categoría pero sin query usa el seed de la categoría", () => {
    expect(mapIntent({ ...base, category: "terror" }).keywords).toEqual(["historias de terror"]);
  });

  it("el orden por defecto es relevancia", () => {
    expect(mapIntent({ ...base, q: "gta" }).order).toBe("relevance");
  });

  it("normaliza acentos y mayúsculas", () => {
    expect(normalizeText("  QuIeRo Ver CÓMO se HACE  ")).toBe("quiero ver como se hace");
  });
});
