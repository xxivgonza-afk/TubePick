import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatRelativeDate,
  formatViews,
  parseIsoDuration,
  publishedAfterIso,
} from "@/utils/format";

describe("parseIsoDuration", () => {
  it("parsea formatos ISO 8601 de YouTube", () => {
    expect(parseIsoDuration("PT5M20S")).toBe(320);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("PT2H")).toBe(7200);
  });

  it("devuelve 0 ante formatos inválidos", () => {
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("")).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formatea mm:ss y h:mm:ss", () => {
    expect(formatDuration(320)).toBe("5:20");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(45)).toBe("0:45");
  });

  it("protege contra valores inválidos", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
  });
});

describe("formatViews", () => {
  it("usa formato compacto en español", () => {
    const noBreak = (value: string) => value.replace(/\u00A0/g, " ");
    expect(formatViews(1)).toBe("1 vista");
    expect(noBreak(formatViews(1_500_000))).toBe("1,5 M vistas");
    expect(noBreak(formatViews(25_000))).toBe("25 mil vistas");
  });
});

describe("formatRelativeDate", () => {
  it("expresa fechas en el pasado con unidades naturales", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatRelativeDate(threeDaysAgo)).toBe("hace 3 días");
  });

  it("devuelve vacío para fechas futuras o inválidas", () => {
    expect(formatRelativeDate(new Date(Date.now() + 1000).toISOString())).toBe("");
    expect(formatRelativeDate("no-es-una-fecha")).toBe("");
  });
});

describe("publishedAfterIso", () => {
  it("genera la ISO de hace N días", () => {
    const expected = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    expect(publishedAfterIso(7).slice(0, 10)).toBe(expected);
  });
});
