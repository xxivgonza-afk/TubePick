import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import { Toast } from "@/components/toast";
import { VisitTracker } from "@/components/visit-tracker";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/constants/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Qué ver en YouTube`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  keywords: [
    "recomendaciones youtube",
    "qué ver en youtube",
    "videos recomendados",
    "descubrir videos",
    "inteligencia artificial youtube",
    "buscar videos con IA",
    "encontrar videos interesantes",
    "tube pick",
    "tubepick",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Qué ver en YouTube`,
    description: SITE_TAGLINE,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Qué ver en YouTube`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Qué ver en YouTube`,
    description: SITE_TAGLINE,
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "es": SITE_URL,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tubepick:theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
          <Toast />
          <VisitTracker />
        </ThemeProvider>
      </body>
    </html>
  );
}
