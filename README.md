# TubePick

Asistente con IA para descubrir qué ver en YouTube.

Le dices lo que te apetece con tus palabras —«quiero algo para comer», «un podcast para dormir», «aprender React»— y TubePick interpreta tu intención y te recomienda videos relevantes que se abren directamente en YouTube.

## Características

- **IA que entiende tu frase**, no solo palabras clave: «algo de fondo mientras limpio» se convierte en la recomendación correcta.
- **Modo sorpresa**: deja que la IA elija por ti un tema fascinante y poco común.
- **Filtros completos**: categoría, duración, idioma, fecha, orden, shorts / en vivo / videos, modo de consumo y modo familia.
- **Favoritos sin cuenta**: se guardan solo en tu navegador.
- **Privacidad por diseño**: sin cuentas, sin datos en servidores propios, sin publicidad ni seguimiento de terceros.
- **Diseño responsive y accesible** (móvil, tablet y escritorio).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + shadcn-style UI
- **Zod** (validación) y **Vitest** (135 tests)
- **YouTube Data API v3** para los videos
- **Gemini Flash** para interpretar la intención, con fallback determinista por reglas

## Desarrollo

```bash
npm install
cp .env.example .env.local   # rellena YOUTUBE_API_KEY y GEMINI_API_KEY
npm run dev
```

| Script | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npx tsc --noEmit` | Typecheck |

## Legal

- No afiliado a YouTube ni a Google. Los videos se abren siempre en YouTube y su uso se rige por los [Términos del Servicio de YouTube](https://www.youtube.com/t/terms).
- Documentación legal disponible en la app: `/terms`, `/privacy`, `/cookies` y `/legal`.

## Apóyalo

¿Te gusta TubePick? [Invítame un café](https://ko-fi.com/jeremysosa). Es opcional y no condiciona ninguna función.
