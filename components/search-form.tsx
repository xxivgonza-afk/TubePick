"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VIDEO_TYPE_OPTIONS } from "@/constants/filters";
import { buildSearchUrl } from "@/features/search/params";
import { buildSurpriseParams } from "@/features/search/surprise";
import type { SearchFilters } from "@/types/search";

interface SearchFormProps {
  placeholder: string;
}

const DEFAULT_FILTERS: SearchFilters = { q: "", language: "both" };

export function SearchForm({ placeholder }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [videoType, setVideoType] = useState<SearchFilters["videoType"]>("all");

  function submit() {
    router.push(buildSearchUrl({ ...DEFAULT_FILTERS, q: query, videoType }));
  }

  function surpriseMe() {
    const params = buildSurpriseParams({ ...DEFAULT_FILTERS, q: query, videoType });
    router.push(buildSearchUrl(params));
  }

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="natural-language-query" className="sr-only">
          ¿Qué quieres ver hoy?
        </label>
        <Input
          id="natural-language-query"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1 rounded-xl px-4 text-base shadow-sm"
          aria-describedby="search-hint"
        />
        <div className="flex gap-3">
          <Button type="submit" size="lg" className="flex-1 sm:flex-none">
            <Search className="size-4" aria-hidden="true" />
            Buscar
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={surpriseMe} className="flex-1 sm:flex-none">
            <Sparkles className="size-4" aria-hidden="true" />
            Sorpréndeme
          </Button>
        </div>
      </form>
      <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
        <Select
          aria-label="Tipo de contenido"
          value={videoType ?? "all"}
          onChange={(event) => setVideoType(event.target.value as SearchFilters["videoType"])}
          className="h-9"
        >
          {VIDEO_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <p id="search-hint" className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
        Escríbelo con tus palabras: «quiero algo para comer», «un podcast para dormir», «aprender React»…
      </p>
    </div>
  );
}
