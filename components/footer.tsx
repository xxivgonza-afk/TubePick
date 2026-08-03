import { Heart } from "lucide-react";
import Link from "next/link";
import { SITE_NAME } from "@/constants/site";
import { KO_FI_URL } from "@/constants/site";

const LEGAL_LINKS = [
  { href: "/terms", label: "Términos de uso" },
  { href: "/privacy", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/legal", label: "Aviso legal" },
];

const CATEGORIES = [
  { href: "/search?q=videos+de+tecnolog%C3%ADa", label: "Tecnología" },
  { href: "/search?q=videos+de+ciencia", label: "Ciencia" },
  { href: "/search?q=videos+divertidos", label: "Humor" },
  { href: "/search?q=documentales+interesantes", label: "Documentales" },
  { href: "/search?q=podcasts+interesantes", label: "Podcasts" },
  { href: "/search?q=videos+de+gaming", label: "Gaming" },
  { href: "/search?q=m%C3%BAsica+para+escuchar", label: "Música" },
  { href: "/search?q=videos+de+historia", label: "Historia" },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-xs text-muted-foreground sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
              {SITE_NAME}
              <Heart className="size-3 text-brand" aria-hidden="true" />
            </p>
            <p className="max-w-xs text-center sm:text-left">
              Descubre qué ver en YouTube, sin buscar. Escribe lo que te apetece con tus palabras y la IA te recomienda los mejores videos.
            </p>
            <p>
              ¿Te gusta {SITE_NAME}?{" "}
              <a
                href={KO_FI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:text-brand"
              >
                Invítame un café
              </a>
              . Es opcional.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="font-medium text-foreground">Categorías populares</p>
            <nav aria-label="Categorías" className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:justify-start">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="text-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  {cat.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="font-medium text-foreground">Legal</p>
            <nav aria-label="Enlaces legales" className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:justify-start">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t pt-4 text-center text-[11px]">
          <p>
            Tus favoritos e intereses se guardan solo en tu navegador. La única cookie de TubePick
            (90 días) resume esos intereses para personalizar el botón Sorpréndeme.
          </p>
          <p className="mt-1">
            No afiliado a YouTube. Los videos se abren siempre en YouTube. Este producto usa la{" "}
            <a
              href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
            >
              YouTube API Services
            </a>
            . Ver política de privacidad de{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
            >
              Google
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
