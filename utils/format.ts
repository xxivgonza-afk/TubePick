const DURATION_PATTERN = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/** Convierte una duración ISO 8601 de YouTube ("PT1H2M3S") a segundos. */
export function parseIsoDuration(iso: string): number {
  const match = DURATION_PATTERN.exec(iso.trim());
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/** "PT1H2M3S" -> "1:02:03" | "12:34" */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const compactNumber = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });

export function formatViews(viewCount: number): string {
  if (!Number.isFinite(viewCount) || viewCount < 0) return "—";
  if (viewCount === 1) return "1 vista";
  return `${compactNumber.format(viewCount)} vistas`;
}

const relativeDate = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 3 días" / "hace 2 semanas" / "hace 5 meses". */
export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return relativeDate.format(-diffMin, "minute");
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return relativeDate.format(-diffHours, "hour");
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return relativeDate.format(-diffDays, "day");
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return relativeDate.format(-diffMonths, "month");
  return relativeDate.format(-Math.floor(diffMonths / 12), "year");
}

/** ISO de "hoy menos N días" para el filtro de fecha (publishedAfter de la API). */
export function publishedAfterIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}
