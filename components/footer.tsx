import { Heart } from "lucide-react";
import { SITE_NAME } from "@/constants/site";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        <p className="flex items-center gap-1">
          {SITE_NAME} — descubre qué ver en YouTube, sin buscar.
          <Heart className="size-3 text-brand" aria-hidden="true" />
        </p>
        <p>No afiliado a YouTube. Los videos se abren siempre en YouTube.</p>
      </div>
    </footer>
  );
}
