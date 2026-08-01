"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CATEGORY_FILTERS,
  CONSUMPTION_OPTIONS,
  DATE_OPTIONS,
  DURATION_OPTIONS,
  DURATION_RANGE_LIMITS,
  LANGUAGE_OPTIONS,
  ORDER_OPTIONS,
  VIDEO_TYPE_OPTIONS,
} from "@/constants/filters";
import { buildSearchUrl, parseSearchFilters } from "@/features/search/params";
import { buildSurpriseParams } from "@/features/search/surprise";
import { collectUserContext, recordSearchQuery, writeUserContextCookie } from "@/lib/user-context";
import type { SearchFilters } from "@/types/search";

/**
 * Barra de filtros de /search. El estado vive en la URL (query params):
 * el componente la lee y la reescribe, nunca guarda copia local.
 */
export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseSearchFilters(Object.fromEntries(searchParams.entries()));

  /**
   * El texto del input vive en estado local: cada tecla NO toca la URL
   * (reescribirla por tecla dispararía una búsqueda nueva y quemaría cuota).
   * Solo se confirma con Enter o el botón Buscar.
   */
  const [query, setQuery] = useState(filters.q);
  const [lastSyncedQuery, setLastSyncedQuery] = useState(filters.q);
  if (lastSyncedQuery !== filters.q) {
    setLastSyncedQuery(filters.q);
    setQuery(filters.q);
  }

  /**
   * El rango de duración también vive en estado local: cada tecla NO toca
   * la URL (reescribirla por tecla dispararía una búsqueda nueva y quemaría
   * cuota). Solo se confirma con Enter o al salir del campo (blur).
   */
  const [durationMin, setDurationMin] = useState(filters.durationMin ?? "");
  const [durationMax, setDurationMax] = useState(filters.durationMax ?? "");
  const [lastSyncedRange, setLastSyncedRange] = useState(`${filters.durationMin ?? ""}:${filters.durationMax ?? ""}`);
  const currentRange = `${filters.durationMin ?? ""}:${filters.durationMax ?? ""}`;
  if (lastSyncedRange !== currentRange) {
    setLastSyncedRange(currentRange);
    setDurationMin(filters.durationMin ?? "");
    setDurationMax(filters.durationMax ?? "");
  }

  /** Redondea y acota un valor de minutos al rango válido (1–240). */
  function sanitizeMinutes(raw: string): number | undefined {
    if (raw === "") return undefined;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value)) return undefined;
    return Math.min(DURATION_RANGE_LIMITS.max, Math.max(DURATION_RANGE_LIMITS.min, value));
  }

  function commitRange() {
    let min = sanitizeMinutes(String(durationMin));
    let max = sanitizeMinutes(String(durationMax));
    if (min === undefined && max === undefined) return;
    // Un rango invertido no debe producir una búsqueda siempre vacía.
    if (min !== undefined && max !== undefined && min > max) {
      [min, max] = [max, min];
    }
    update({ durationMin: min, durationMax: max });
  }

  function update(partial: Partial<SearchFilters>) {
    router.replace(buildSearchUrl({ ...filters, ...partial }));
  }

  function submit() {
    recordSearchQuery(query);
    // Escribir una query nueva es una intención explícita: se sale del modo
    // sorpresa (si no, la sorpresa se comería el texto que acaba de teclear).
    const next: SearchFilters = { ...filters, q: query, sorpresa: undefined };
    router.replace(buildSearchUrl(next));
  }

  function surpriseMe() {
    writeUserContextCookie(collectUserContext());
    router.replace(buildSearchUrl(buildSurpriseParams(filters)));
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex gap-3"
      >
        <label htmlFor="search-query" className="sr-only">
          ¿Qué quieres ver?
        </label>
        <Input
          id="search-query"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="¿Qué quieres ver?"
          className="h-11 flex-1 rounded-xl px-4 text-base shadow-sm"
        />
        <Button type="submit" className="h-11 rounded-xl px-5" aria-label="Buscar">
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Buscar</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-5"
          onClick={surpriseMe}
          aria-label="Sorpréndeme"
          title="Sorpréndeme"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="hidden md:inline">Sorpréndeme</span>
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros">
        <Select
          aria-label="Categoría"
          value={filters.category ?? ""}
          onChange={(event) => update({ category: (event.target.value || undefined) as SearchFilters["category"] })}
        >
          <option value="">Todas las categorías</option>
          {CATEGORY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.emoji ? `${option.emoji} ` : ""}
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Duración"
          value={filters.duration ?? ""}
          onChange={(event) => update({ duration: (event.target.value || undefined) as SearchFilters["duration"] })}
        >
          <option value="">Cualquier duración</option>
          {DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Idioma"
          value={filters.language}
          onChange={(event) => update({ language: event.target.value as SearchFilters["language"] })}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Fecha de publicación"
          value={filters.date ?? ""}
          onChange={(event) => update({ date: (event.target.value || undefined) as SearchFilters["date"] })}
        >
          <option value="">Cualquier fecha</option>
          {DATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Tipo de contenido"
          value={filters.videoType ?? "all"}
          onChange={(event) =>
            update({ videoType: event.target.value as SearchFilters["videoType"] })
          }
        >
          {VIDEO_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Modo de consumo"
          value={filters.consumption ?? ""}
          onChange={(event) =>
            update({ consumption: (event.target.value || undefined) as SearchFilters["consumption"] })
          }
        >
          <option value="">Cómo lo vas a ver</option>
          {CONSUMPTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button
          type="button"
          variant={filters.family ? "default" : "outline"}
          className="h-9 px-3 text-sm"
          aria-pressed={filters.family}
          onClick={() => update({ family: !filters.family })}
        >
          👨‍👩‍👧 Apto para toda la familia
        </Button>

        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Duración mínima en minutos"
            placeholder="Min min"
            value={durationMin}
            min={DURATION_RANGE_LIMITS.min}
            max={DURATION_RANGE_LIMITS.max}
            onChange={(event) => setDurationMin(event.target.value)}
            onBlur={commitRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitRange();
              }
            }}
            className="h-9 w-24 px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Duración máxima en minutos"
            placeholder="Max min"
            value={durationMax}
            min={DURATION_RANGE_LIMITS.min}
            max={DURATION_RANGE_LIMITS.max}
            onChange={(event) => setDurationMax(event.target.value)}
            onBlur={commitRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitRange();
              }
            }}
            className="h-9 w-24 px-3 text-sm"
          />
        </div>

        <Select
          aria-label="Orden"
          value={filters.order ?? ""}
          onChange={(event) => update({ order: (event.target.value || undefined) as SearchFilters["order"] })}
        >
          <option value="">Relevancia</option>
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
