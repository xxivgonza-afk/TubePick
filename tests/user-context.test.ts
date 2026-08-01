import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bumpVisitCount,
  collectUserContext,
  extractTerms,
  normalizeUserTerm,
  parseUserContextCookie,
  recordSearchQuery,
  writeUserContextCookie,
} from "@/lib/user-context";
import { USER_CONTEXT_COOKIE } from "@/constants/site";

describe("normalizeUserTerm", () => {
  it("normaliza minúsculas, acentos y caracteres raros", () => {
    expect(normalizeUserTerm("  Programación!!!  ")).toBe("programacion");
    expect(normalizeUserTerm("Clavero & Luisito")).toBe("clavero luisito");
    expect(normalizeUserTerm("React")).toBe("react");
  });

  it("limita la longitud", () => {
    expect(normalizeUserTerm("a".repeat(100))).toHaveLength(24);
  });
});

describe("extractTerms", () => {
  it("saca las palabras significativas sin stopwords", () => {
    expect(extractTerms("quiero ver algo mientras como")).toEqual(["mientras", "como"]);
  });

  it("ignora términos de menos de 3 letras", () => {
    expect(extractTerms("el gta de mario")).toEqual(["gta", "mario"]);
  });
});

describe("parseUserContextCookie", () => {
  it("devuelve contexto vacío sin cookie", () => {
    expect(parseUserContextCookie(undefined)).toEqual({ terms: [], visits: 0 });
    expect(parseUserContextCookie("")).toEqual({ terms: [], visits: 0 });
  });

  it("parsea términos codificados y visitas", () => {
    const raw = "v=7;t=react%2Cminecraft%2Ccomedia";
    expect(parseUserContextCookie(raw)).toEqual({
      terms: ["react", "minecraft", "comedia"],
      visits: 7,
    });
  });

  it("descarta términos vacíos o basura y limita el número", () => {
    const raw = `v=2;t=${"a,".repeat(50)}react`;
    const parsed = parseUserContextCookie(raw);
    expect(parsed.terms).toHaveLength(1);
    expect(parsed.terms[0]).toBe("react");
    expect(parsed.visits).toBe(2);
  });

  it("no rompe con visitas inválidas", () => {
    expect(parseUserContextCookie("v=abc;t=react").visits).toBe(0);
  });
});

describe("funciones de cliente (navegador simulado)", () => {
  interface FakeBrowser {
    window?: { localStorage: Pick<Storage, "getItem" | "setItem"> };
    document?: { cookie: string };
  }
  const browser = globalThis as unknown as FakeBrowser;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    browser.window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
      },
    };
    browser.document = { cookie: "" };
  });

  afterEach(() => {
    delete browser.window;
    delete browser.document;
  });

  it("sin navegador degrada sin romper", () => {
    delete browser.window;
    delete browser.document;
    expect(collectUserContext()).toEqual({ terms: [], visits: 0 });
  });

  it("recordSearchQuery registra, normaliza y no repite idénticas", () => {
    recordSearchQuery("  quiero ver GTA!!!  ");
    recordSearchQuery("gta");
    recordSearchQuery("quiero ver gta");
    expect(JSON.parse(storage.get("tubepick:search-history")!)).toEqual(["quiero ver gta", "gta"]);
  });

  it("recordSearchQuery mantiene máximo 8 y descarta vacíos", () => {
    recordSearchQuery("  ");
    for (let i = 1; i <= 10; i++) recordSearchQuery(`query ${i}`);
    const history = JSON.parse(storage.get("tubepick:search-history")!) as string[];
    expect(history).toHaveLength(8);
    expect(history[0]).toBe("query 10");
  });

  it("bumpVisitCount incrementa desde cero", () => {
    bumpVisitCount();
    bumpVisitCount();
    expect(JSON.parse(storage.get("tubepick:visits")!)).toBe(2);
  });

  it("collectUserContext mezcla favoritos e historial por frecuencia", () => {
    const favorites = {
      a: { title: "Documental de la Antigua Roma" },
      b: { title: "Curiosidades de la Antigua Roma" },
      c: { title: "Historia del Imperio Romano" },
      d: { title: "Recetas de cocina rápida" },
    };
    storage.set("tubepick:favorites", JSON.stringify(favorites));
    storage.set("tubepick:search-history", JSON.stringify(["roma", "comida"]));
    storage.set("tubepick:visits", JSON.stringify(5));

    const context = collectUserContext();
    expect(context.visits).toBe(5);
    expect(context.terms).toContain("roma");
    expect(context.terms).toContain("antigua");
    expect(context.terms).toContain("cocina");
  });

  it("collectUserContext limita a 12 términos", () => {
    const favorites: Record<string, { title: string }> = {};
    for (let i = 0; i < 20; i++) favorites[`v${i}`] = { title: `tema ${i} curiosidades` };
    storage.set("tubepick:favorites", JSON.stringify(favorites));
    expect(collectUserContext().terms.length).toBeLessThanOrEqual(12);
  });

  it("writeUserContextCookie codifica el valor completo y vale 90 días", () => {
    writeUserContextCookie({ terms: ["react", "minecraft"], visits: 3 });
    expect(browser.document?.cookie).toContain(
      `${USER_CONTEXT_COOKIE}=v%3D3%3Bt%3Dreact%2Cminecraft`
    );
    expect(browser.document?.cookie).toContain("max-age=7776000");
    expect(browser.document?.cookie).toContain("path=/");
    expect(browser.document?.cookie).toContain("samesite=lax");
  });

  it("cookie escrita y leída hacen ida y vuelta (el ; no rompe el valor)", () => {
    writeUserContextCookie({ terms: ["clavero", "luisito"], visits: 9 });
    const raw = browser.document!.cookie.split("; ")[0].replace(`${USER_CONTEXT_COOKIE}=`, "");
    expect(raw).toBe("v%3D9%3Bt%3Dclavero%2Cluisito");
    expect(parseUserContextCookie(raw)).toEqual({ terms: ["clavero", "luisito"], visits: 9 });
  });
});
