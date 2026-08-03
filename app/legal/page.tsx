import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/legal-page";
import {
  JURISDICTION,
  KO_FI_URL,
  OPERATOR_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/constants/site";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: `Aviso legal e identificación del sitio ${SITE_NAME}. Información del operador.`,
  alternates: {
    canonical: `${SITE_URL}/legal`,
  },
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Aviso legal"
      description="Datos identificativos del sitio y condiciones generales de uso de su contenido."
    >
      <LegalSection title="1. Identificación">
        <p>
          En cumplimiento de lo dispuesto en la Ley 34/2002, de 11 de julio, de servicios de la
          sociedad de la información y de comercio electrónico (LSSI-CE), te informamos de que:
        </p>
        <LegalList
          items={[
            <><strong>Sitio web:</strong> {SITE_NAME}.</>,
            <><strong>Titular:</strong> {OPERATOR_NAME}.</>,
            <><strong>Contacto:</strong> mensaje privado a través de la página de{" "}
              <LegalLink href={KO_FI_URL}>Ko-fi de {SITE_NAME}</LegalLink>.</>,
            <><strong>Finalidad:</strong> servicio de recomendación de videos públicos de YouTube.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. No afiliación">
        <p>
          {SITE_NAME} no está afiliado a YouTube, Google ni Ko-fi, y no ostenta ningún derecho sobre
          los videos mostrados. Estas marcas pertenecen a sus respectivos titulares. Los videos se
          reproducen siempre en YouTube y el acceso a ellos se rige por los Términos del Servicio de
          YouTube.
        </p>
      </LegalSection>

      <LegalSection title="3. Responsabilidad">
        <p>
          {SITE_NAME} se proporciona con fines informativos. El operador no se hace responsable de la
          disponibilidad de los videos (dependen de YouTube), del contenido generado por terceros al
          que se enlaza, ni de las decisiones del usuario basadas en las recomendaciones. Enlaces
          externos (YouTube, Ko-fi) dirigen a sitios de terceros cuyo contenido y políticas no son
          responsabilidad del operador.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual">
        <p>
          La estructura, marca, diseño y código de {SITE_NAME} son propiedad del operador salvo
          indicación contraria. Queda prohibida su reproducción, distribución o transformación sin
          autorización expresa. Los videos, miniaturas y descripciones pertenecen a sus autores y
          canales.
        </p>
      </LegalSection>

      <LegalSection title="5. Ley aplicable">
        <p>
          Este aviso se rige por la legislación de {JURISDICTION}. Cualquier controversia se someterá
          a los tribunales competentes conforme a lo dispuesto en los{" "}
          <LegalLink href="/terms">términos de uso</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}