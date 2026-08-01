export const CATEGORY_IDS = [
  "tecnologia",
  "ciencia",
  "historia",
  "programacion",
  "humor",
  "terror",
  "podcasts",
  "documentales",
  "economia",
  "gaming",
  "musica",
  "anime",
  "comida",
  "deportes",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Palabras clave usadas como query cuando el usuario no aporta términos propios. */
  seed: string[];
  /** Términos (normalizados sin acentos) que disparan esta categoría en el intent-mapper. */
  intent: string[];
  /**
   * ID de la categoría de YouTube (videoCategoryId). Usado SOLO cuando el
   * usuario elige la categoría explícitamente, para que el filtro sea real
   * en la API y no dependa solo de las keywords.
   */
  youtubeCategoryId?: number;
}

export const CATEGORIES: Category[] = [
  {
    id: "tecnologia",
    label: "Tecnología",
    emoji: "🖥️",
    seed: ["lo ultimo en tecnologia"],
    intent: [
      "tecnologia",
      "gadgets",
      "telefono",
      "iphone",
      "android",
      "inteligencia artificial",
      "ia",
      "ai",
      "computadora",
      "ordenador",
      "laptop",
      "robot",
      "realidad virtual",
    ],
    youtubeCategoryId: 28,
  },
  {
    id: "ciencia",
    label: "Ciencia",
    emoji: "🔬",
    seed: ["datos curiosos de ciencia"],
    intent: [
      "ciencia",
      "cientifico",
      "cientifica",
      "universo",
      "espacio",
      "fisica",
      "quimica",
      "biologia",
      "astronomia",
      "neurociencia",
    ],
    youtubeCategoryId: 28,
  },
  {
    id: "historia",
    label: "Historia",
    emoji: "🏛️",
    seed: ["datos curiosos de historia"],
    intent: [
      "historia",
      "historico",
      "historica",
      "guerra",
      "imperio",
      "civilizacion",
      "medieval",
      "antiguo",
      "antigua",
      "arqueologia",
      "egipto",
      "roma",
    ],
    youtubeCategoryId: 27,
  },
  {
    id: "programacion",
    label: "Programación",
    emoji: "💻",
    seed: ["programacion para principiantes"],
    intent: [
      "programacion",
      "programar",
      "codigo",
      "code",
      "developer",
      "desarrollador",
      "desarrolladora",
      "javascript",
      "python",
      "react",
      "typescript",
      "frontend",
      "backend",
      "algoritmo",
      "algoritmos",
    ],
    youtubeCategoryId: 27,
  },
  {
    id: "humor",
    label: "Humor",
    emoji: "😂",
    seed: ["videos graciosos"],
    intent: [
      "humor",
      "comedia",
      "gracioso",
      "graciosa",
      "divertido",
      "divertida",
      "chiste",
      "chistes",
      "risa",
      "meme",
      "memes",
    ],
    youtubeCategoryId: 23,
  },
  {
    id: "terror",
    label: "Terror",
    emoji: "👻",
    seed: ["historias de terror"],
    intent: [
      "terror",
      "miedo",
      "susto",
      "horror",
      "paranormal",
      "fantasma",
      "fantasmas",
      "asustar",
      "espeluznante",
      "creepy",
    ],
    youtubeCategoryId: 39,
  },
  {
    id: "podcasts",
    label: "Podcasts",
    emoji: "🎧",
    seed: ["podcasts"],
    intent: ["podcast", "podcasts"],
    youtubeCategoryId: 24,
  },
  {
    id: "documentales",
    label: "Documentales",
    emoji: "🎬",
    seed: ["documentales"],
    intent: ["documental", "documentales", "natgeo", "nature"],
    youtubeCategoryId: 35,
  },
  {
    id: "economia",
    label: "Economía",
    emoji: "📈",
    seed: ["finanzas personales"],
    intent: [
      "economia",
      "finanzas",
      "dinero",
      "inversion",
      "invertir",
      "negocios",
      "emprender",
      "bolsa",
      "criptomonedas",
      "ahorrar",
    ],
    youtubeCategoryId: 27,
  },
  {
    id: "gaming",
    label: "Gaming",
    emoji: "🎮",
    seed: ["gameplay"],
    intent: [
      "gaming",
      "videojuego",
      "videojuegos",
      "juegos",
      "jugar",
      "minecraft",
      "fortnite",
      "playstation",
      "xbox",
      "nintendo",
      "gta",
      "league of legends",
      "mario",
    ],
    youtubeCategoryId: 20,
  },
  {
    id: "musica",
    label: "Música",
    emoji: "🎵",
    seed: ["musica relajante"],
    intent: [
      "musica",
      "canciones",
      "cancion",
      "playlist",
      "playlists",
      "banda",
      "bandas",
      "concierto",
      "conciertos",
    ],
    youtubeCategoryId: 10,
  },
  {
    id: "anime",
    label: "Anime",
    emoji: "🎌",
    seed: ["anime"],
    intent: ["anime", "animes", "manga", "one piece", "naruto", "dragon ball"],
    youtubeCategoryId: 1,
  },
  {
    id: "comida",
    label: "Comida",
    emoji: "🍔",
    seed: ["recetas fáciles"],
    intent: [
      "comida",
      "comer",
      "cocinar",
      "cocina",
      "receta",
      "recetas",
      "cena",
      "desayuno",
      "almuerzo",
      "hamburguesa",
      "pizza",
      "postre",
      "postres",
      "restaurante",
      "chef",
    ],
    youtubeCategoryId: 26,
  },
  {
    id: "deportes",
    label: "Deportes",
    emoji: "⚽",
    seed: ["mejores jugadas"],
    intent: [
      "deportes",
      "deporte",
      "futbol",
      "baloncesto",
      "basket",
      "nba",
      "partido",
      "goles",
      "tenis",
      "f1",
      "formula 1",
      "boxeo",
      "natacion",
      "atletismo",
    ],
    youtubeCategoryId: 17,
  },
];

export function getCategory(id: CategoryId | undefined | null): Category | undefined {
  return id ? CATEGORIES.find((c) => c.id === id) : undefined;
}

export function getCategoryLabel(id: CategoryId): string {
  return getCategory(id)?.label ?? id;
}

/** ID de categoría de YouTube, para que el filtro de categoría sea real en la API. */
export function getCategoryYouTubeId(id: CategoryId | undefined | null): number | undefined {
  return getCategory(id)?.youtubeCategoryId;
}
