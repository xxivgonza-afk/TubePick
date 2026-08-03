import Link from "next/link";
import { Bookmark, Coffee } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { KO_FI_URL } from "@/constants/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Navegación principal">
          <a
            href={KO_FI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Apoya TubePick con un café"
            aria-label="Apoya TubePick con un café"
          >
            <Coffee className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Invítame un café</span>
          </a>
          <Link
            href="/favorites"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Favoritos"
          >
            <Bookmark className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Favoritos</span>
            <span className="sm:hidden" aria-hidden="true">
              Favs
            </span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
