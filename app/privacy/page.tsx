import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import { JURISDICTION, KO_FI_URL, OPERATOR_NAME, SITE_NAME } from "@/constants/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo trata ${SITE_NAME} tus datos: qué guarda, qué envía y cómo borrarlo.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      description={`${SITE_NAME} está diseñado para funcionar sin cuentas y recopilando el mínimo posible de datos. Esto es todo lo que debes saber: qué guardamos, qué enviamos a terceros y cómo borrarlo todo.`}
    >
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          El sitio {SITE_NAME} está operado por {OPERATOR_NAME}. Para cuestiones de privacidad
          puedes escribir un mensaje privado a través de la página de{" "}
          <LegalLink href={KO_FI_URL}>Ko-fi de {SITE_NAME}</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="2. Principio general: tus datos se quedan en tu navegador">
        <p>
          {SITE_NAME} no tiene cuentas de usuario y no guarda en servidores propios ni favoritos,
          ni historial, ni intereses. Los favoritos, el historial de búsqueda, el número de visitas
          y el tema visual se guardan exclusivamente en el almacenamiento local de tu navegador
          (localStorage) y no se envían a ningún servidor.
        </p>
        <LegalList
          items={[
            <><strong>Favoritos</strong> (clave «tubepick:favorites»): los videos que guardas para volver a verlos.</>,
            <><strong>Historial de búsqueda</strong> (clave «tubepick:search-history»): textos de tus búsquedas recientes.</>,
            <><strong>Visitas</strong> (clave «tubepick:visits»): un contador local para saber si eres un usuario habitual.</>,
            <><strong>Tema</strong> (clave «tubepick:theme») y <strong>consentimiento de cookies</strong> (clave «tubepick:cookie-consent»).</>,
          ]}
        />
        <p>
          Puedes borrar todos estos datos en cualquier momento desde la configuración de tu
          navegador («borrar datos del sitio» o «localStorage»), o simplemente visitando{" "}
          <LegalLink href="/favorites">tus favoritos</LegalLink> y pulsando «Vaciar».
        </p>
      </LegalSection>

      <LegalSection title="3. La cookie de personalización (tubepick_ctx)">
        <p>
          Cuando pulsas «Sorpréndeme», el servicio crea una única cookie llamada{" "}
          <code className="rounded bg-muted px-1 py-0.5">tubepick_ctx</code> con una duración de 90
          días. Contiene únicamente un resumen de tus términos de interés y tu contador de visitas
          (ambos de origen local). Se usa para que la sorpresa esté afinada a tus gustos. No la
          creamos al navegar por el sitio: solo aparece cuando la activas tú al usar esa función.
          Ver la <LegalLink href="/cookies">política de cookies</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="4. Datos que se envían a terceros para funcionar">
        <LegalList
          items={[
            <>
              <strong>YouTube Data API v3 (Google):</strong> al buscar, se envían a la API de
              YouTube las palabras de tu búsqueda y los filtros elegidos (categoría, duración,
              idioma…), y la API responde con videos públicos. También se consultan los metadatos
              de los videos mostrados. Aplica la{" "}
              <LegalLink href="https://policies.google.com/privacy">Política de Privacidad de Google</LegalLink>{" "}
              y los{" "}
              <LegalLink href="https://www.youtube.com/t/terms">Términos del Servicio de YouTube</LegalLink>.
            </>,
            <>
              <strong>Google AI Studio / Gemini (IA):</strong> para interpretar tu frase (y generar
              la sorpresa), se envía el texto de tu consulta al modelo Gemini Flash. No se envían
              datos de tu navegador ni de tus favoritos salvo los términos de interés que tú mismo
              hayas generado con «Sorpréndeme». Aplica la{" "}
              <LegalLink href="https://policies.google.com/privacy">Política de Privacidad de Google</LegalLink>.
            </>,
            <>
              <strong>Ko-fi:</strong> si haces una donación, abandonas {SITE_NAME} y te mueves a la
              plataforma Ko-fi; allí se aplica su propia política de privacidad. {SITE_NAME} no
              recibe automáticamente ningún dato personal tuyo de Ko-fi.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Registros técnicos del servidor">
        <p>
          Como en cualquier servicio web, el proveedor de hosting (p. ej. Vercel) puede registrar
          datos técnicos estándar de las peticiones (dirección IP, navegador, URL solicitada,
          fecha y hora) con fines de funcionamiento, seguridad y prevención de abusos. Estos datos
          no se usan para perfilar ni identificar usuarios, y no los combinamos con ninguna otra
          fuente.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso de la API de YouTube Services (divulgación requerida)">
        <p>
          {SITE_NAME} utiliza la API de YouTube Services para mostrar resultados de búsqueda y
          metadatos de videos públicos. Al usar {SITE_NAME} aceptas estar sujeto a los{" "}
          <LegalLink href="https://www.youtube.com/t/terms">Términos del Servicio de YouTube</LegalLink>.
        </p>
        <p>
          Los datos que {SITE_NAME} obtiene de la API de YouTube (títulos, miniaturas, estadísticas)
          son datos públicos de YouTube y no se almacenan de forma permanente en servidores
          propios: se cachean temporalmente en memoria del servidor para limitar el consumo de la
          cuota diaria de la API (máx. 24 horas) y se descartan al reiniciar.
        </p>
        <p>
          <strong>Borra tus datos:</strong> si quieres eliminar cualquier dato tuyo vinculado a
          {SITE_NAME} (la cookie de contexto y el localStorage), puedes hacerlo desde la
          configuración de tu navegador en cualquier momento. No existe base de datos de usuarios
          que borrar.
        </p>
      </LegalSection>

      <LegalSection title="7. Publicidad, analítica y venta de datos">
        <p>
          {SITE_NAME} no muestra publicidad, no instala cookies de publicidad ni de analítica de
          terceros, y no vende ni comparte tus datos con terceros para fines comerciales. Las
          donaciones no se asocian a ningún dato de navegación.
        </p>
      </LegalSection>

      <LegalSection title="8. Base legal del tratamiento (RGPD)">
        <p>
          Los datos técnicos se tratan sobre la base del <em>interés legítimo</em> en el correcto
          funcionamiento y seguridad del servicio (art. 6.1.f del RGPD). La cookie de
          personalización se crea solo tras tu acción explícita al pulsar «Sorpréndeme» y se trata
          sobre la base de tu <em>consentimiento</em> (art. 6.1.a), que puedes retirar en cualquier
          momento borrando la cookie.
        </p>
      </LegalSection>

      <LegalSection title="9. Tus derechos">
        <p>
          Si resides en el Espacio Económico Europeo, tienes derecho a acceder, rectificar,
          suprimir y portar tus datos, y a oponerte a su tratamiento. Para ejercerlos, escríbenos a
          través de Ko-fi indicando tu solicitud; como no guardamos datos personales de usuarios,
          la práctica totalidad de las solicitudes se resuelven borrando la cookie y el
          localStorage en tu navegador. También tienes derecho a reclamar ante la autoridad de
          control competente (en {JURISDICTION}, la AEPD).
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios en esta política">
        <p>
          Actualizaremos esta página cuando cambie la forma en que tratamos datos. La versión
          vigente se publica siempre aquí, con su fecha de actualización.
        </p>
      </LegalSection>
    </LegalPage>
  );
}