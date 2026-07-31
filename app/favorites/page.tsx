import type { Metadata } from "next";
import { FavoritesList } from "@/components/favorites-list";

export const metadata: Metadata = {
  title: "Tus favoritos",
  description: "Videos que has guardado para ver después en YouTube.",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <FavoritesList />
    </section>
  );
}
