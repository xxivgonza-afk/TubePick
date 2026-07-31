# TubePick

Asistente inteligente para descubrir qué ver en YouTube. No es un buscador ni un reproductor: le dices lo que te apetece con tus palabras («quiero algo para comer», «un podcast interesante») y te recomienda videos relevantes que se abren directamente en YouTube.

**Fase 0 (MVP)**: sin login, sin base de datos. Favoritos en `localStorage`, caché de servidor para no agotar la cuota de la API.

## Requisitos

- Node.js 20+
- Una clave de la [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena YOUTUBE_API_KEY
npm run dev
```

### Cuota de la API

Cada búsqueda consume ~101 unidades (search.list = 100 + videos.list = 1). Con el cupo por defecto (10.000 unidades/día) hay presupuesto para ~100 búsquedas frescas. Por eso:

- **Caché en memoria (TTL 12 h)** en el repository (`repositories/youtube.ts` + `services/cache.ts`), transparente al resto de la app.
- **Data Cache de Next.js** (`next: { revalidate: 43200 }` en los fetch) como capa compartida entre instancias en Vercel.
- La clave de caché normaliza categoría + parámetros, de modo que las búsquedas populares y repetidas (categorías del home, Sorpréndeme) se sirven de caché.

## Arquitectura (Clean Architecture, Fase 0)

```
app/             → rutas y páginas (Server Components por defecto; /search es dinámico)
components/      → UI reutilizable (shadcn-style, client solo donde hay interactividad)
features/search/ → params (Zod de la URL), sorpréndeme, orquestación server
services/        → intent-mapper, cliente de YouTube API (Zod), caché TTL
repositories/    → acceso a datos externos (YouTube API, con caché transparente)
types/           → tipos compartidos (Video, SearchFilters, NormalizedSearchParams)
constants/       → categorías, filtros, textos
lib/ y utils/    → helpers puros (cn, formatos, hash, random)
stores/          → Zustand: SOLO estado de UI (tema, toast)
hooks/           → useFavorites (localStorage) y utilidades de cliente
```

### La capa de intención (`services/intent-mapper.ts`)

Es la pieza que el MVP debe validar: si interpretar la intención («quiero algo para comer» → `recetas fáciles`, categoría comida) produce mejores resultados que buscar directo en YouTube. Está **aislada del resto del sistema**:

- Entrada: `SearchFilters` (texto libre + filtros explícitos).
- Salida: `NormalizedSearchParams` (keywords, categoría, duración, idioma, fecha, orden).

En la Fase 2 se reemplaza únicamente la implementación interna de `mapIntent` por una llamada a un modelo de IA con la misma firma; ni la UI, ni el repository ni el resto de la app cambian.

### Estado

- La URL es la única fuente de verdad de la búsqueda (`/search?q=…&category=…&duration=…`), validada con Zod (`features/search/params.ts`).
- Zustand queda reservado para estado de UI puro (tema claro/oscuro, toast).
- Los favoritos viven en `localStorage` (`hooks/use-favorites.ts`), con `useSyncExternalStore` para sincronizar entre componentes.

## Decisiones técnicas clave

- **Next.js 16** (App Router): `searchParams` es una Promise; las páginas que lo usan son dinámicas por definición.
- **Selects nativos** en lugar de Radix: accesibilidad (teclado + lectores de pantalla) gratuita y menos dependencias.
- **Framer Motion** solo para transiciones sutiles (fade-in del grid, toast), con `useReducedMotion` y CSS `prefers-reduced-motion`.
- **`next/image`** con `remotePatterns` para `i.ytimg.com`, lazy loading y `sizes` correctos.
- **Error handling tipado**: cuota agotada, clave inválida, red caída y configuración faltante se muestran con mensajes accionables (`services/youtube-api.ts`).

## Scripts

```bash
npm run dev        # desarrollo (Turbopack)
npm run build      # build de producción
npm run lint       # ESLint
npm test           # Vitest (38 tests: intent-mapper, sorpréndeme, params, formatos, repository)
npx tsc --noEmit   # typecheck
```

## Checklist de lanzamiento

- [ ] `NEXT_PUBLIC_SITE_URL` apuntando al dominio real (variable de entorno del proyecto en Vercel, nunca en el repo ni en `.env.local` en producción). Sin esto, el sitemap, los robots y los tags Open Graph apuntan a `http://localhost:3000`.
- [ ] `YOUTUBE_API_KEY` en Vercel como variable de entorno, usando una clave **nueva y restringida** (restricción de API a YouTube Data API v3 y, si es posible, de referrer HTTP al dominio) — nunca la que se compartió en `.env.local`.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm test` en verde.
- [ ] Tras el primer despliegue, revisar los logs de Vercel (sin `403 quotaExceeded`).

## Roadmap

- **Fase 1**: Supabase + Prisma + Auth.js (perfil, historial, favoritos en la nube).
- **Fase 2**: motor de recomendación con IA real (mismo contrato que `mapIntent`), colecciones, listas compartidas, monetización.

No afiliado a YouTube. Los videos siempre se abren en YouTube.
