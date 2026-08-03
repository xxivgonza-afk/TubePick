import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { ResultsSkeleton } from "@/components/results-skeleton";
import { getCategory } from "@/constants/categories";
import { buildDisplayQuery } from "@/services/intent-mapper";
import { parseSearchFilters, type RawSearchParams } from "@/features/search/params";
import { SearchResults } from "./search-results";

interface SearchPageProps {
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const filters = parseSearchFilters(await searchParams);
  const title = buildDisplayQuery(filters);
  const category = getCategory(filters.category);

  return {
    title,
    description: `Resultados recomendados para «${title}»${category ? ` en ${category.label}` : ""}. Videos de YouTube seleccionados para ti por TubePick.`,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description: `Resultados recomendados para «${title}». Videos de YouTube seleccionados para ti por TubePick.`,
    },
    twitter: {
      title,
      description: `Resultados recomendados para «${title}». Videos de YouTube seleccionados para ti por TubePick.`,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = parseSearchFilters(await searchParams);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <FilterBar />
      </div>
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults filters={filters} />
      </Suspense>
    </section>
  );
}
