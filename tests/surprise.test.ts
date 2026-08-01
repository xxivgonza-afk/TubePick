import { describe, expect, it } from "vitest";
import { buildSurpriseParams } from "@/features/search/surprise";
import { CATEGORY_IDS } from "@/constants/categories";
import { DATE_FILTERS, DURATION_FILTERS, ORDER_FILTERS } from "@/constants/filters";
import type { SearchFilters } from "@/types/search";

const base: SearchFilters = { q: "", language: "both" };

describe("buildSurpriseParams", () => {
  it("rellena con valores válidos todo lo no elegido", () => {
    const result = buildSurpriseParams(base);
    expect(CATEGORY_IDS).toContain(result.category);
    expect(DURATION_FILTERS).toContain(result.duration);
    expect(DATE_FILTERS).toContain(result.date);
    expect(ORDER_FILTERS).toContain(result.order);
    expect(result.language).toBe("both");
  });

  it("respeta los filtros elegidos explícitamente", () => {
    const result = buildSurpriseParams({ ...base, category: "humor", duration: "long" });
    expect(result.category).toBe("humor");
    expect(result.duration).toBe("long");
    expect(result.date).toBeDefined();
    expect(result.order).toBeDefined();
  });

  it("conserva la query del usuario", () => {
    const result = buildSurpriseParams({ ...base, q: "quiero algo para comer" });
    expect(result.q).toBe("quiero algo para comer");
    expect(result.category).toBeDefined();
  });

  it("activa siempre el modo sorpresa (la IA elige el tema)", () => {
    expect(buildSurpriseParams(base).sorpresa).toBe(true);
    expect(buildSurpriseParams({ ...base, q: "algo" }).sorpresa).toBe(true);
  });

  it("es determinista sobre filtros explícitos", () => {
    const fixed: SearchFilters = { ...base, category: "deportes", date: "year" };
    const a = buildSurpriseParams(fixed);
    const b = buildSurpriseParams(fixed);
    expect(a.category).toBe(b.category);
    expect(a.date).toBe(b.date);
  });
});
