import { CATEGORIES, type CategoryId } from "@/constants/categories";
import { DATE_FILTERS, DURATION_FILTERS, ORDER_FILTERS } from "@/constants/filters";
import { pickRandom } from "@/utils/random";
import type { SearchFilters } from "@/types/search";

/**
 * "Sorpréndeme": genera una búsqueda aleatoria respetando los filtros que el
 * usuario eligió explícitamente. Solo aleatoriza lo que quedó sin decidir
 * (filtro "Cualquiera"): categoría, duración, fecha y orden.
 *
 * Activa además el modo sorpresa (`sorpresa=1`): el servidor deja que la IA
 * elija el tema en lugar de usar la frase del usuario. El resultado se
 * escribe en la URL como parámetros concretos, así la búsqueda es
 * determinista, compartible y cacheable (no quema cuota extra).
 */
export function buildSurpriseParams(current: SearchFilters): SearchFilters {
  return {
    ...current,
    category: current.category ?? pickRandom(CATEGORIES.map((c) => c.id as CategoryId)),
    duration: current.duration ?? pickRandom(DURATION_FILTERS),
    date: current.date ?? pickRandom(DATE_FILTERS),
    order: current.order ?? pickRandom(ORDER_FILTERS),
    sorpresa: true,
  };
}
