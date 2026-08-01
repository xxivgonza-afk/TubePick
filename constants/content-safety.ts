/**
 * Seguridad de contenido infantil: términos y patrones usados para excluir
 * contenido orientado a niños por defecto. Se aplica en dos capas:
 *
 *  1. Términos de exclusión en la query de YouTube (operador `-término`),
 *     añadidos por el orquestador cuando la intención NO es `family`.
 *  2. Filtro post-captura en repositories/youtube.ts con patrones de títulos
 *     y canales conocidos de contenido infantil.
 *
 * Si el usuario pide explícitamente contenido familiar ("algo para mi hijo
 * de 5 años"), la intención detecta `audience: "family"` y se saltan ambas.
 */

export const CHILD_EXCLUDE_TERMS = [
  "niños",
  "ninos",
  "niñas",
  "ninas",
  "para bebés",
  "kids",
  "cocomelon",
  "peppa pig",
  "bebé",
  "nursery rhymes",
  "canciones infantiles",
  "toy videos",
] as const;

/** Patrones de título/canal que delatan contenido infantil conocido. */
export const CHILD_CONTENT_PATTERNS = [
  /\bcocomelon\b/i,
  /\bpeppa\s*pig\b/i,
  /\bpaw\s*patrol\b/i,
  /\bbaby\s*shark\b/i,
  /\bblippi\b/i,
  /\bryan'?s\s*world\b/i,
  /\bmasha\s*(y|and)\s*el?\s*oso\b/i,
  /\bdora\s*(la\s*)?exploradora?\b/i,
  /\bcanciones?\s*infantiles?\b/i,
  /\bnursery\s*rhymes?\b/i,
  /\bjuegos?\s*infantiles?\b/i,
  /\bdibujos?\s*animados?\s*(para\s*niños?|infantiles?|para\s*bebés?)\b/i,
  /\b(toy|videos?\s*para)\s*(kids|niños?|bebés?)\b/i,
] as const;
