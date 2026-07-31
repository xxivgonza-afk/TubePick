import Link from "next/link";
import { QUICK_CATEGORIES } from "@/constants/quick-categories";
import type { SearchFilters } from "@/types/search";
import { buildSearchUrl } from "@/features/search/params";

/** Chips rápidos del home: un toque, una búsqueda con intención. */
export function QuickCategories() {
  const baseFilters: SearchFilters = { q: "", language: "both" };

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="group"
      aria-label="Categorías rápidas"
    >
      {QUICK_CATEGORIES.map((chip) => {
        const filters: SearchFilters = chip.query
          ? { ...baseFilters, q: chip.query }
          : { ...baseFilters, category: chip.category };
        return (
          <Link
            key={chip.label}
            href={buildSearchUrl(filters)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-background px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">{chip.emoji}</span>
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
