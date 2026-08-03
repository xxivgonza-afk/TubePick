import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { USER_CONTEXT_COOKIE, SITE_NAME } from "@/constants/site";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: `Qué cookies usa ${SITE_NAME} y cómo gestionarlas.`,
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      description={`${SITE_NAME} usa una única cookie propia y no usa cookies de publicidad ni de analítica de terceros. Aquí lo explicamos todo.`}
    >
      <LegalSection title="1. Qué es una cookie y qué usamos aquí">
        <p>
          Una cookie es un pequeño archivo que el sitio guarda en tu navegador. {SITE_NAME} utiliza
          una sola cookie propia, con fines de personalización:
        </p>
        <LegalList
          items={[
            <>
              <strong>
                <code className="rounded bg-muted px-1 py-0.5">{USER_CONTEXT_COOKIE}</code> (90
                días)
              </strong>
              : guarda un resumen de tus términos de interés y tu contador de visitas, para que el
              botón «Sorpréndeme» te proponga temas afinados a tus gustos. Esta cookie{" "}
              <strong>solo se crea cuando pulsas «Sorpréndeme»</strong> (tu acción explícita), nunca
              al navegar por el sitio.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Almacenamiento local (localStorage)">
        <p>
          Además de la cookie anterior, {SITE_NAME} usa el almacenamiento local de tu navegador
          (localStorage) para tus favoritos, historial de búsqueda, contador de visitas, tema visual
          y el registro de este consentimiento. El localStorage no es una cookie: esos datos no se
          envían a ningún servidor y solo existen en tu dispositivo.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies de terceros">
        <p>
          {SITE_NAME} no instala cookies de publicidad, analítica ni seguimiento de terceros. Las
          únicas cookies de terceros serían las que establecen los propios sitios si visitas sus
          enlaces externos: YouTube (al abrir un video) y Ko-fi (al hacer una donación), regidas por
          sus respectivas políticas.
        </p>
      </LegalSection>

      <LegalSection title="4. Consentimiento y gestión">
        <p>
          Al pulsar «Aceptar» en el aviso de cookies, o al usar «Sorpréndeme» (que es lo que crea la
          cookie), consientes el uso descrito aquí. Puedes retirar tu consentimiento en cualquier
          momento borrando los datos del sitio desde la configuración de tu navegador.
        </p>
        <LegalList
          items={[
            <>Chrome / Edge / Brave: Ajustes → Privacidad y seguridad → Borrar datos de navegación → Datos de sitios web.</>,
            <>Firefox: Ajustes → Privacidad y seguridad → Cookies y datos del sitio → Gestionar datos.</>,
            <>Safari: Preferencias → Privacidad → Gestionar datos de sitios web.</>,
          ]}
        />
        <p>
          Si borras la cookie y el localStorage, se perderán tus favoritos y la personalización, y
          la próxima sorpresa volverá a partir de cero. Detalles sobre tus datos en la{" "}
          <LegalLink href="/privacy">política de privacidad</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}