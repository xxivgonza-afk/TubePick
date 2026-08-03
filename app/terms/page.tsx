import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { JURISDICTION, KO_FI_URL, SITE_NAME, SITE_URL } from "@/constants/site";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: `Términos de uso del servicio ${SITE_NAME}. Condiciones generales para usarTubePick.`,
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos de uso"
      description={`Los presentes términos regulan el uso del sitio web ${SITE_NAME}. Al utilizar ${SITE_NAME} aceptas estas condiciones en su totalidad.`}
    >
      <LegalSection title="1. El servicio">
        <p>
          {SITE_NAME} es un servicio de recomendación de videos de YouTube: introduces una búsqueda
          con tus palabras (o pulsas «Sorpréndeme») y el servicio interpreta tu intención y te
          sugiere videos públicos. {SITE_NAME} no aloja, descarga ni retransmite videos: todas las
          reproducciones se abren siempre en YouTube.
        </p>
      </LegalSection>

      <LegalSection title="2. Uso de YouTube y Google">
        <p>
          {SITE_NAME} usa la YouTube Data API v3 y el modelo de IA Gemini Flash de Google.
          Al utilizar {SITE_NAME} también se aplican los Términos del Servicio de YouTube y la
          Política de Privacidad de Google.
        </p>
        <LegalList
          items={[
            <>No puedes usar {SITE_NAME} para descargar contenido de YouTube, saltarte sus restricciones ni usar los resultados con fines ilícitos.</>,
            <>Los videos recomendados siguen perteneciendo a sus autores y canales, y si un video es retirado de YouTube dejará de estar disponible.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cuentas y datos">
        <p>
          {SITE_NAME} no requiere registrar una cuenta. Los favoritos, el historial y las
          preferencias se guardan únicamente en tu navegador (localStorage) y en una única cookie de
          personalización de 90 días que se crea solo cuando usas «Sorpréndeme». Lo explicamos en{" "}
          <LegalLink href="/privacy">la política de privacidad</LegalLink> y en{" "}
          <LegalLink href="/cookies">la política de cookies</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="4. Recomendaciones generadas con IA">
        <p>
          Las sugerencias se generan automáticamente con inteligencia artificial. Pueden ser
          imperfectas, imprecisas u ocasionalmente inapropiadas para ti, y no constituyen consejo
          profesional ni editorial de ningún tipo. Eres responsable de lo que decidas ver.
        </p>
      </LegalSection>

      <LegalSection title="5. Donaciones">
        <p>
          La sección «Invítame un café» enlaza a una donación opcional en Ko-fi. Las donaciones son
          voluntarias, no condicionan ninguna función del servicio y no crean ninguna relación
          contractual adicional. Las donaciones se rigen por las condiciones de Ko-fi y no tienen
          derecho de devolución salvo lo que establezca su plataforma o la ley aplicable.
        </p>
      </LegalSection>

      <LegalSection title="6. Conducta prohibida">
        <p>Al usar {SITE_NAME}te comprometes a no:</p>
        <LegalList
          items={[
            <>acceder al servicio de forma automatizada masiva (scraping, bots o carga en volumen) sin autorización previa;</>,
            <>falsear el origen de las solicitudes ni interferir con la seguridad o el funcionamiento del servicio;</>,
            <>usar el servicio con fines ilegales, fraudulentos o que vulneren derechos de terceros.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Propiedad intelectual">
        <p>
          La marca, el nombre y el código de {SITE_NAME} pertenecen a su operador. Los videos,
          imágenes, títulos y marcas de los creadores mostrados pertenecen a sus respectivos
          titulares, y su mención en {SITE_NAME} es meramente informativa. No hay afiliación alguna
          entre {SITE_NAME}, YouTube / Google ni Ko-fi.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidad y responsabilidad">
        <p>
          {SITE_NAME} se ofrece «tal cual», sin garantías de disponibilidad ininterrumpida ni de que
          los resultados sean exactos. En la máxima extensión permitida por la ley, el operador no
          será responsable de los daños directos o indirectos derivados del uso o la imposibilidad
          de uso del servicio, de las recomendaciones generadas o del contenido de los videos
          accedidos a través de los enlaces.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios en el servicio y en estos términos">
        <p>
          Podemos modificar, suspender o cerrar el servicio en cualquier momento, y actualizar estos
          términos cuando sea necesario. La versión vigente se publica siempre en esta página y su
          uso continuado del servicio tras el cambio implica aceptación.
        </p>
      </LegalSection>

      <LegalSection title="10. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por la ley de {JURISDICTION}. Si eres consumidor, no pierdes
          las protecciones imperativas de tu país de residencia. Para el resto de los casos, las
          reclamaciones se someten a los juzgados del lugar de residencia del operador en {JURISDICTION}.
        </p>
      </LegalSection>

      <LegalSection title="11. Contacto">
        <p>
          Ante cualquier pregunta sobre estos términos, puedes escribir un mensaje privado a través
          de la página de <LegalLink href={KO_FI_URL}>Ko-fi de {SITE_NAME}</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}