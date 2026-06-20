export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-800/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-flugzz-accent/20 bg-flugzz-accent/10">
              <img src="/Flugzz.svg" alt="Flugzz" className="h-6 w-6" style={{ filter: "invert(1)" }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Términos y Condiciones de Uso</h1>
              <p className="text-xs text-zinc-500">Última actualización: junio 2026</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. Aceptación de los términos">
            <p>
              Al acceder o utilizar la plataforma Flugzz CRM (en adelante, &ldquo;la Plataforma&rdquo;),
              usted acepta los presentes Términos y Condiciones de Uso. Si no está de acuerdo con
              alguno de estos términos, no utilice la Plataforma.
            </p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>
              Flugzz CRM es una plataforma de gestión de relaciones con clientes (CRM) diseñada para
              el sector inmobiliario. La Plataforma permite la administración de leads, contactos,
              pipeline de ventas, documentación, comunicaciones y otras funcionalidades relacionadas
              con la operación inmobiliaria.
            </p>
          </Section>

          <Section title="3. Registro y cuenta">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Para utilizar la Plataforma, debe crear una cuenta proporcionando información veraz y actualizada.</li>
              <li>Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>No puede compartir su cuenta con terceros ni permitir el acceso no autorizado.</li>
              <li>Debe notificar inmediatamente cualquier uso no autorizado de su cuenta a <strong className="text-zinc-100">legal@flugzz.com</strong>.</li>
            </ul>
          </Section>

          <Section title="4. Planes y suscripción">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>La Plataforma se ofrece mediante planes de suscripción pagados.</li>
              <li>El pago se realiza de forma anticipada según el plan seleccionado (mensual o anual).</li>
              <li>Los precios están expresados en pesos mexicanos (MXN) e incluyen los impuestos aplicables.</li>
              <li>La falta de pago dará lugar a la suspensión del acceso hasta que se regularice la situación.</li>
              <li>Puede cancelar su suscripción en cualquier momento; el acceso continuará hasta el final del período pagado.</li>
            </ul>
          </Section>

          <Section title="5. Uso permitido">
            <p>Usted se compromete a:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Utilizar la Plataforma únicamente para fines lícitos y comerciales legítimos.</li>
              <li>No violar leyes, regulaciones o derechos de terceros.</li>
              <li>No introducir malware, virus o código dañino.</li>
              <li>No realizar ingeniería inversa, modificar o descompilar la Plataforma.</li>
              <li>No exceder los límites de uso razonables que puedan afectar la estabilidad del servicio.</li>
              <li>No utilizar la Plataforma para enviar comunicaciones no solicitadas (spam).</li>
            </ul>
          </Section>

          <Section title="6. Propiedad intelectual">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Flugzz CRM y todos sus componentes (código, diseño, marcas, logotipos) son propiedad de Ultimate Technology and Arquitectonics.</li>
              <li>Se otorga una licencia limitada, no exclusiva e intransferible para usar la Plataforma durante la vigencia de la suscripción.</li>
              <li>Los datos que usted ingresa en la Plataforma son de su propiedad. Nosotros no reclamamos propiedad sobre su contenido.</li>
            </ul>
          </Section>

          <Section title="7. Privacidad y datos">
            <p>
              El tratamiento de sus datos personales se rige por nuestro{" "}
              <a href="/aviso-de-privacidad" className="text-flugzz-accent hover:underline">
                Aviso de Privacidad
              </a>
              , que forma parte integral de estos Términos y Condiciones.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>La Plataforma se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;, sin garantías de ningún tipo.</li>
              <li>No garantizamos que la Plataforma esté libre de errores, interrupciones o fallos técnicos.</li>
              <li>En ningún caso seremos responsables por daños indirectos, incidentales o consecuentes derivados del uso de la Plataforma.</li>
              <li>Nuestra responsabilidad máxima se limita al monto pagado por la suscripción en los últimos 12 meses.</li>
            </ul>
          </Section>

          <Section title="9. Cancelación y terminación">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Usted puede cancelar su cuenta en cualquier momento desde la configuración de la Plataforma.</li>
              <li>Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.</li>
              <li>Al terminar la cuenta, los datos serán eliminados después de 90 días, salvo obligación legal de retenerlos.</li>
              <li>Puede solicitar la exportación de sus datos antes de la terminación.</li>
            </ul>
          </Section>

          <Section title="10. Modificaciones">
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios
              serán notificados a través de la Plataforma con al menos 15 días de antelación. El uso
              continuado después de la fecha de vigencia constituye la aceptación de los cambios.
            </p>
          </Section>

          <Section title="11. Ley aplicable">
            <p>
              Estos Términos y Condiciones se rigen por las leyes de los Estados Unidos Mexicanos.
              Cualquier controversia será sometida a la jurisdicción de los tribunales de la Ciudad de México.
            </p>
          </Section>

          <Section title="12. Contacto">
            <p>
              Para cualquier pregunta relacionada con estos términos, contáctenos en:{" "}
              <strong className="text-zinc-100">legal@flugzz.com</strong>
            </p>
          </Section>
        </div>

        <div className="mt-10 border-t border-zinc-800/60 pt-6 text-center text-xs text-zinc-600">
          <p>
            Ultimate Technology and Arquitectonics &mdash; Todos los derechos reservados.
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
