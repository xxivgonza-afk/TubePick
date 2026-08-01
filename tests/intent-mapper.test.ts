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
    expect(params.keywords).toEqual(["react"]);
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

describe("negaciones", () => {
  it("excluye el término negado y mantiene la categoría del resto ('terror que no sea de fantasmas')", () => {
    const params = mapIntent({ ...base, q: "quiero ver terror que no sea de fantasmas" });
    expect(params.category).toBe("terror");
    expect(params.keywords).toContain("terror");
    expect(params.keywords).toContain("-fantasmas");
  });

  it("'sin' extrae los términos a excluir ('podcast sin cortes publicitarios')", () => {
    const params = mapIntent({ ...base, q: "un podcast sin cortes publicitarios" });
    expect(params.category).toBe("podcasts");
    expect(params.keywords).toContain("-cortes");
    expect(params.keywords).toContain("-publicitarios");
  });

  it("'no quiero nada de X' anula la categoría y excluye el término", () => {
    const params = mapIntent({ ...base, q: "no quiero nada de terror" });
    expect(params.category).toBeNull();
    expect(params.keywords).toContain("-terror");
  });

  it("'excepto' captura el término excluido", () => {
    const params = mapIntent({ ...base, q: "quiero ver futbol excepto los partidos de goles" });
    expect(params.keywords).toContain("-goles");
  });

  it("'sin embargo' no genera exclusiones", () => {
    const params = mapIntent({ ...base, q: "un podcast sin embargo interesante" });
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("'sin embargo' con contenido detrás no se traga la categoría ('un podcast sin embargo de terror')", () => {
    const params = mapIntent({ ...base, q: "un podcast sin embargo de terror" });
    expect(params.category).toBe("podcasts");
    expect(params.keywords).toContain("terror");
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("'menos' comparativo no genera exclusiones ('videos de menos de 10 minutos')", () => {
    const params = mapIntent({ ...base, q: "videos de menos de 10 minutos" });
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("una contraafirmación conserva su categoría ('no quiero deportes, quiero humor')", () => {
    const params = mapIntent({ ...base, q: "no quiero deportes, quiero humor" });
    expect(params.category).toBe("humor");
    expect(params.keywords).toContain("humor");
    expect(params.keywords).toContain("-deportes");
    expect(params.keywords).not.toContain("-humor");
  });
});

describe("puntuación de categorías", () => {
  it("'documental de historia' prioriza la señal más específica y conserva la otra", () => {
    const params = mapIntent({ ...base, q: "un documental de historia" });
    expect(params.category).toBe("documentales");
    expect(params.keywords).toContain("documental");
    expect(params.keywords).toContain("historia");
    expect(params.duration).toBe("long");
  });

  it("'cancion de terror' va a música y conserva ambos términos", () => {
    const params = mapIntent({ ...base, q: "una cancion de terror" });
    expect(params.category).toBe("musica");
    expect(params.keywords).toContain("cancion");
    expect(params.keywords).toContain("terror");
  });

  it("'podcast de inteligencia artificial' gana tecnología por especificidad del término", () => {
    const params = mapIntent({ ...base, q: "un podcast de inteligencia artificial" });
    expect(params.category).toBe("tecnologia");
  });
});

describe("seeds de descubrimiento", () => {
  it("usa seeds de descubrimiento mejorados sin query propia", () => {
    expect(mapIntent({ ...base, category: "economia" }).keywords).toEqual(["finanzas personales"]);
    expect(mapIntent({ ...base, category: "musica" }).keywords).toEqual(["musica relajante"]);
    expect(mapIntent({ ...base, category: "programacion" }).keywords).toEqual([
      "programacion para principiantes",
    ]);
  });
});
