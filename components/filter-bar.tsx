"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CATEGORY_FILTERS,
  DATE_OPTIONS,
  DURATION_OPTIONS,
  LANGUAGE_OPTIONS,
  ORDER_OPTIONS,
} from "@/constants/filters";
import { buildSearchUrl, parseSearchFilters } from "@/features/search/params";
import { buildSurpriseParams } from "@/features/search/surprise";
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

  function update(partial: Partial<SearchFilters>) {
    router.replace(buildSearchUrl({ ...filters, ...partial }));
  }

  function submit() {
    router.replace(buildSearchUrl({ ...filters, q: query }));
  }

  function surpriseMe() {
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
