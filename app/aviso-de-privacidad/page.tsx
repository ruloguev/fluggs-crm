import type { Metadata } from "next"
import { Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "Aviso de Privacidad - Flugzz CRM",
  description: "Aviso de privacidad de Flugzz CRM. Conoce cómo protegemos tus datos personales.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://flugzz.xyz/aviso-de-privacidad" },
}

const FlugzzIsotipo = () => (
  <img src="/Flugzz.svg" alt="Flugzz" className="h-8 w-8" style={{ filter: "invert(1)" }} />
)

export default function PrivacyNoticePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-center gap-3 border-b border-zinc-800/60 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-flugzz-accent/20 bg-flugzz-accent/10">
            <FlugzzIsotipo />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Aviso de Privacidad</h1>
            <p className="text-xs text-zinc-500">Última actualización: junio 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="Responsable">
            <p>
              Ultimate Technology and Arquitectonics, con domicilio en Av. P.º de la Reforma 284-Piso 17,
              Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX, es el responsable del tratamiento
              de sus datos personales.
            </p>
          </Section>

          <Section title="Datos que recopilamos">
            <p>Para operar la plataforma Flugzz CRM, recopilamos:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Datos de identificación: nombre completo, correo electrónico, teléfono</li>
              <li>Datos laborales: puesto, rol, equipo de trabajo</li>
              <li>Datos de contacto de clientes y prospectos inmobiliarios</li>
              <li>Documentación oficial: identificaciones oficiales, comprobantes de domicilio, contratos, escrituras, y cualquier documento compartido a través de la plataforma</li>
              <li>Historial de interacciones, actividades y seguimiento comercial</li>
              <li>Metadatos de uso: última conexión, preferencias de la plataforma</li>
            </ul>
          </Section>

          <Section title="Finalidades del tratamiento">
            <p className="mb-2"><em>Primarias (necesarias):</em></p>
            <ul className="mb-4 list-disc space-y-1.5 pl-5">
              <li>Gestión y operación del CRM inmobiliario</li>
              <li>Asignación y seguimiento de leads y prospectos</li>
              <li>Coordinación de actividades comerciales entre el equipo</li>
              <li>Generación de reportes e indicadores de desempeño</li>
              <li>Cumplimiento de obligaciones contractuales con clientes</li>
              <li>Almacenamiento y gestión de documentación oficial relacionada con operaciones inmobiliarias</li>
            </ul>
            <p className="mb-2"><em>Secundarias (con su consentimiento):</em></p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Análisis de datos con inteligencia artificial para sugerencias comerciales</li>
              <li>Mejora de la plataforma basada en patrones de uso</li>
              <li>Segmentación y personalización de campañas publicitarias</li>
            </ul>
          </Section>

          <Section title="Transferencia de datos">
            <p>Sus datos pueden ser compartidos con:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Proveedores de infraestructura tecnológica (Supabase, Google Cloud, Vercel)</li>
              <li>Servicios de inteligencia artificial (Google Gemini) — solo para procesamiento autorizado</li>
              <li>Plataformas publicitarias (Meta/Facebook, Google Ads) para campañas comerciales</li>
              <li>Autoridades competentes en caso de requerimiento legal</li>
            </ul>
            <p className="mt-2">
              No transferimos datos personales a terceros sin su consentimiento, salvo las excepciones
              previstas en el artículo 37 de la LFPDPPP.
            </p>
          </Section>

          <Section title="Responsabilidad del usuario">
            <p>Al utilizar Flugzz CRM, usted es responsable de:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Contar con el consentimiento expreso de sus propios clientes y prospectos para el tratamiento de sus datos personales dentro de la plataforma</li>
              <li>No registrar información sensible de terceros sin la autorización correspondiente</li>
              <li>Utilizar la documentación compartida únicamente para fines lícitos relacionados con la operación inmobiliaria</li>
            </ul>
          </Section>

          <Section title="Derechos ARCO">
            <p>Usted tiene derecho a:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Acceso:</strong> conocer qué datos tenemos y cómo se usan</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos para fines específicos</li>
            </ul>
            <p className="mt-3">
              Para ejercer sus derechos ARCO, envíe un correo a: <strong className="text-zinc-100">legal@flugzz.xyz</strong>
            </p>
          </Section>

          <Section title="Limitación de uso y divulgación">
            <p>
              Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger sus datos
              contra daño, pérdida, alteración, destrucción o uso no autorizado, incluyendo cifrado en tránsito
              y reposo, control de acceso basado en roles y auditoría de sesiones.
            </p>
          </Section>

          <Section title="Consentimiento">
            <p>
              Al aceptar este aviso, usted otorga su consentimiento expreso para el tratamiento de sus datos
              personales, incluyendo datos de terceros que registre en la plataforma, conforme a lo descrito
              anteriormente.
            </p>
          </Section>

          <Section title="Cambios al aviso">
            <p>
              Cualquier modificación a este aviso será notificada a través de la plataforma.
              Le recomendamos revisarlo periódicamente.
            </p>
          </Section>
        </div>

        <div className="mt-10 border-t border-zinc-800/60 pt-6 text-center text-xs text-zinc-600">
          <p>
            Si tienes dudas, contáctanos en{" "}
            <a href="mailto:legal@flugzz.xyz" className="text-flugzz-accent hover:underline">
              legal@flugzz.xyz
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-zinc-200">{title}</h2>
      <div className="text-zinc-400">{children}</div>
    </section>
  )
}
