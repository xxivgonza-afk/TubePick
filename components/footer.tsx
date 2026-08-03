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

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        <p className="flex items-center gap-1">
          {SITE_NAME} — descubre qué ver en YouTube, sin buscar.
          <Heart className="size-3 text-brand" aria-hidden="true" />
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
          . Es opcional: no condiciona ninguna función.
        </p>
        <p>
          Tus favoritos e intereses se guardan solo en tu navegador. La única cookie de TubePick
          (90 días) resume esos intereses para personalizar el botón Sorpréndeme.
        </p>
        <p>No afiliado a YouTube. Los videos se abren siempre en YouTube.</p>
        <nav aria-label="Enlaces legales" className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
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
    </footer>
  );
}
