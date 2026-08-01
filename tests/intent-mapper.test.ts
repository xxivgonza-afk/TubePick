import { describe, expect, it } from "vitest";
import { detectFamilyRequest, mapIntentByRules, normalizeText } from "@/services/intent-mapper";
import type { SearchFilters } from "@/types/search";

const base: SearchFilters = { q: "", language: "both" };

describe("mapIntentByRules (fallback determinístico)", () => {
  it("detecta categoría 'comida' y cae al seed sin términos propios", () => {
    const params = mapIntentByRules({ ...base, q: "quiero algo para comer" });
    expect(params.category).toBe("comida");
    expect(params.keywords).toEqual(["recetas fáciles"]);
  });

  it("detecta 'podcast' como categoría y duración media", () => {
    const params = mapIntentByRules({ ...base, q: "un podcast interesante" });
    expect(params.category).toBe("podcasts");
    expect(params.duration).toBe("medium");
  });

  it("conserva términos específicos de la categoría ('aprender react')", () => {
    const params = mapIntentByRules({ ...base, q: "aprender react" });
    expect(params.category).toBe("programacion");
    expect(params.keywords).toEqual(["react"]);
  });

  it("mezcla palabras propias con el término disparador ('historias de terror de madrugada')", () => {
    const params = mapIntentByRules({ ...base, q: "historias de terror de madrugada" });
    expect(params.category).toBe("terror");
    expect(params.keywords).toEqual(["historias", "madrugada", "terror"]);
  });

  it("descarta verbos genéricos de intención ('quiero jugar algo con mi hermano')", () => {
    const params = mapIntentByRules({ ...base, q: "quiero jugar algo con mi hermano" });
    expect(params.category).toBe("gaming");
    expect(params.keywords).toEqual(["hermano"]);
  });

  it("detecta idioma desde el texto", () => {
    expect(mapIntentByRules({ ...base, q: "las noticias en espanol" }).language).toBe("es");
    expect(mapIntentByRules({ ...base, q: "some videos in english" }).language).toBe("en");
  });

  it("detecta orden desde el texto", () => {
    expect(mapIntentByRules({ ...base, q: "los videos mas vistos de futbol" }).order).toBe("viewCount");
    expect(mapIntentByRules({ ...base, q: "algo reciente" }).order).toBe("date");
  });

  it("detecta duración desde el texto", () => {
    expect(mapIntentByRules({ ...base, q: "algo rapido de ver" }).duration).toBe("short");
    expect(mapIntentByRules({ ...base, q: "un documental largo" }).duration).toBe("long");
  });

  it("la categoría explícita de la UI gana a la inferida", () => {
    const params = mapIntentByRules({ ...base, q: "algo gracioso", category: "ciencia" });
    expect(params.category).toBe("ciencia");
  });

  it("la categoría explícita genera videoCategoryId; la inferida no", () => {
    expect(mapIntentByRules({ ...base, category: "terror" }).videoCategoryId).toBe(39);
    expect(mapIntentByRules({ ...base, q: "historias de terror" }).videoCategoryId).toBeUndefined();
  });

  it("el filtro family se resuelve en el orquestador, no en el mapper", () => {
    const params = mapIntentByRules({ ...base, q: "canciones" });
    expect(params).not.toHaveProperty("excludeChildContent");
  });

  it("el filtro de fecha genera publishedAfter de 7 días", () => {
    const params = mapIntentByRules({ ...base, date: "week" });
    const expected = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    expect(params.publishedAfter?.slice(0, 10)).toBe(expected);
  });

  it("sin query ni categoría usa un seed por defecto", () => {
    expect(mapIntentByRules(base).keywords).toEqual(["viral"]);
  });

  it("con categoría pero sin query usa el seed de la categoría", () => {
    expect(mapIntentByRules({ ...base, category: "terror" }).keywords).toEqual(["historias de terror"]);
  });

  it("el orden por defecto es relevancia", () => {
    expect(mapIntentByRules({ ...base, q: "gta" }).order).toBe("relevance");
  });

  it("normaliza acentos y mayúsculas", () => {
    expect(normalizeText("  QuIeRo Ver CÓMO se HACE  ")).toBe("quiero ver como se hace");
  });
});

describe("negaciones", () => {
  it("excluye el término negado y mantiene la categoría del resto ('terror que no sea de fantasmas')", () => {
    const params = mapIntentByRules({ ...base, q: "quiero ver terror que no sea de fantasmas" });
    expect(params.category).toBe("terror");
    expect(params.keywords).toContain("terror");
    expect(params.keywords).toContain("-fantasmas");
  });

  it("'sin' extrae los términos a excluir ('podcast sin cortes publicitarios')", () => {
    const params = mapIntentByRules({ ...base, q: "un podcast sin cortes publicitarios" });
    expect(params.category).toBe("podcasts");
    expect(params.keywords).toContain("-cortes");
    expect(params.keywords).toContain("-publicitarios");
  });

  it("'no quiero nada de X' anula la categoría y excluye el término", () => {
    const params = mapIntentByRules({ ...base, q: "no quiero nada de terror" });
    expect(params.category).toBeNull();
    expect(params.keywords).toContain("-terror");
  });

  it("'excepto' captura el término excluido", () => {
    const params = mapIntentByRules({ ...base, q: "quiero ver futbol excepto los partidos de goles" });
    expect(params.keywords).toContain("-goles");
  });

  it("'sin embargo' no genera exclusiones", () => {
    const params = mapIntentByRules({ ...base, q: "un podcast sin embargo interesante" });
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("'sin embargo' con contenido detrás no se traga la categoría ('un podcast sin embargo de terror')", () => {
    const params = mapIntentByRules({ ...base, q: "un podcast sin embargo de terror" });
    expect(params.category).toBe("podcasts");
    expect(params.keywords).toContain("terror");
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("'menos' comparativo no genera exclusiones ('videos de menos de 10 minutos')", () => {
    const params = mapIntentByRules({ ...base, q: "videos de menos de 10 minutos" });
    expect(params.keywords.some((k) => k.startsWith("-"))).toBe(false);
  });

  it("una contraafirmación conserva su categoría ('no quiero deportes, quiero humor')", () => {
    const params = mapIntentByRules({ ...base, q: "no quiero deportes, quiero humor" });
    expect(params.category).toBe("humor");
    expect(params.keywords).toContain("humor");
    expect(params.keywords).toContain("-deportes");
    expect(params.keywords).not.toContain("-humor");
  });
});

describe("puntuación de categorías", () => {
  it("'documental de historia' prioriza la señal más específica y conserva la otra", () => {
    const params = mapIntentByRules({ ...base, q: "un documental de historia" });
    expect(params.category).toBe("documentales");
    expect(params.keywords).toContain("documental");
    expect(params.keywords).toContain("historia");
    expect(params.duration).toBe("long");
  });

  it("'cancion de terror' va a música y conserva ambos términos", () => {
    const params = mapIntentByRules({ ...base, q: "una cancion de terror" });
    expect(params.category).toBe("musica");
    expect(params.keywords).toContain("cancion");
    expect(params.keywords).toContain("terror");
  });

  it("'podcast de inteligencia artificial' gana tecnología por especificidad del término", () => {
    const params = mapIntentByRules({ ...base, q: "un podcast de inteligencia artificial" });
    expect(params.category).toBe("tecnologia");
  });
});

describe("seeds de descubrimiento", () => {
  it("usa seeds de descubrimiento mejorados sin query propia", () => {
    expect(mapIntentByRules({ ...base, category: "economia" }).keywords).toEqual(["finanzas personales"]);
    expect(mapIntentByRules({ ...base, category: "musica" }).keywords).toEqual(["musica relajante"]);
    expect(mapIntentByRules({ ...base, category: "programacion" }).keywords).toEqual([
      "programacion para principiantes",
    ]);
  });
});

describe("detectFamilyRequest (fallback de reglas)", () => {
  it("detecta peticiones explícitas de contenido infantil", () => {
    expect(detectFamilyRequest("algo para mi hijo de 5 años")).toBe(true);
    expect(detectFamilyRequest("quiero ver dibujos animados con mi hija")).toBe(true);
    expect(detectFamilyRequest("videos para bebes")).toBe(true);
    expect(detectFamilyRequest("canciones para niños pequeños")).toBe(true);
  });

  it("no marca consultas de adultos como familiares", () => {
    expect(detectFamilyRequest("quiero ver algo mientras como")).toBe(false);
    expect(detectFamilyRequest("documental de historia con atención")).toBe(false);
    expect(detectFamilyRequest("los mejores goles de la semana")).toBe(false);
  });
});

describe("rango de duración personalizado", () => {
  it("convierte minutos a segundos y mantiene el bucket solo si no hay rango", () => {
    const params = mapIntentByRules({ ...base, durationMin: 10, durationMax: 20, q: "gta" });
    expect(params.durationMinSeconds).toBe(600);
    expect(params.durationMaxSeconds).toBe(1200);
  });

  it("no genera rango cuando no se pidió", () => {
    const params = mapIntentByRules({ ...base, q: "gta" });
    expect(params.durationMinSeconds).toBeUndefined();
    expect(params.durationMaxSeconds).toBeUndefined();
  });
});
