"use client"

import { useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"

type Props = {
  profileId: string
  onAccepted: () => void
}

export function PrivacyNoticeModal({ profileId, onAccepted }: Props) {
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleAccept() {
    if (!accepted || saving) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ privacy_notice_accepted_at: new Date().toISOString() })
      .eq("id", profileId)
    setSaving(false)
    if (!error) onAccepted()
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-xl border-zinc-800 bg-zinc-950 p-0 [&>button]:hidden">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-zinc-800/60 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-flugzz-accent/20 bg-flugzz-accent/10">
              <ShieldCheck className="h-5 w-5 text-flugzz-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Aviso de Privacidad</h2>
              <p className="text-xs text-zinc-500">Última actualización: mayo 2026</p>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-300" style={{ maxHeight: "55vh" }}>
            <h3 className="text-sm font-medium text-zinc-200">Responsable</h3>
            <p>
              Ultimate Technology and Arquitectonics, con domicilio en{" "}
              Av. P.º de la Reforma 284-Piso 17, Juárez, Cuauhtémoc,{" "}
              06600 Ciudad de México, CDMX,{" "}
              es el responsable del tratamiento de sus datos personales.
            </p>

            <h3 className="text-sm font-medium text-zinc-200">Datos que recopilamos</h3>
            <p>Para operar la plataforma Flugzz CRM, recopilamos:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Datos de identificación: nombre completo, correo electrónico, teléfono</li>
              <li>Datos laborales: puesto, rol, equipo de trabajo</li>
              <li>Datos de contacto de clientes y prospectos inmobiliarios</li>
              <li>Documentación oficial: identificaciones oficiales, comprobantes de domicilio, contratos, escrituras, y cualquier documento compartido a través de la plataforma</li>
              <li>Historial de interacciones, actividades y seguimiento comercial</li>
              <li>Metadatos de uso: última conexión, preferencias de la plataforma</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-200">Finalidades del tratamiento</h3>
            <p><em>Primarias (necesarias):</em></p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Gestión y operación del CRM inmobiliario</li>
              <li>Asignación y seguimiento de leads y prospectos</li>
              <li>Coordinación de actividades comerciales entre el equipo</li>
              <li>Generación de reportes e indicadores de desempeño</li>
              <li>Cumplimiento de obligaciones contractuales con clientes</li>
              <li>Almacenamiento y gestión de documentación oficial relacionada con operaciones inmobiliarias</li>
            </ul>
            <p><em>Secundarias (con su consentimiento):</em></p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Análisis de datos con inteligencia artificial para sugerencias comerciales</li>
              <li>Mejora de la plataforma basada en patrones de uso</li>
              <li>Segmentación y personalización de campañas publicitarias</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-200">Transferencia de datos</h3>
            <p>Sus datos pueden ser compartidos con:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Proveedores de infraestructura tecnológica (Supabase, Google Cloud, Vercel)</li>
              <li>Servicios de inteligencia artificial (Google Gemini) — solo para procesamiento autorizado</li>
              <li>Plataformas publicitarias (Meta/Facebook, Google Ads) para campañas comerciales</li>
              <li>Autoridades competentes en caso de requerimiento legal</li>
            </ul>
            <p>No transferimos datos personales a terceros sin su consentimiento, salvo las excepciones previstas en el artículo 37 de la LFPDPPP.</p>

            <h3 className="text-sm font-medium text-zinc-200">Responsabilidad del usuario</h3>
            <p>Al utilizar Flugzz CRM, usted es responsable de:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Contar con el consentimiento expreso de sus propios clientes y prospectos para el tratamiento de sus datos personales dentro de la plataforma</li>
              <li>No registrar información sensible de terceros sin la autorización correspondiente</li>
              <li>Utilizar la documentación compartida únicamente para fines lícitos relacionados con la operación inmobiliaria</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-200">Derechos ARCO</h3>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Acceso:</strong> conocer qué datos tenemos y cómo se usan</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos para fines específicos</li>
            </ul>
            <p>Para ejercer sus derechos ARCO, envíe un correo a: <strong>legal@flugzz.xyz</strong></p>

            <h3 className="text-sm font-medium text-zinc-200">Limitación de uso y divulgación</h3>
            <p>Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger sus datos contra daño, pérdida, alteración, destrucción o uso no autorizado, incluyendo cifrado en tránsito y reposo, control de acceso basado en roles y auditoría de sesiones.</p>

            <h3 className="text-sm font-medium text-zinc-200">Consentimiento</h3>
            <p>Al aceptar este aviso, usted otorga su consentimiento expreso para el tratamiento de sus datos personales, incluyendo datos de terceros que registre en la plataforma, conforme a lo descrito anteriormente.</p>

            <h3 className="text-sm font-medium text-zinc-200">Cambios al aviso</h3>
            <p>Cualquier modificación a este aviso será notificada a través de la plataforma. Le recomendamos revisarlo periódicamente.</p>
          </div>

          <div className="border-t border-zinc-800/60 px-6 py-4">
            <label className="mb-4 flex items-start gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 text-flugzz-accent focus:ring-flugzz-accent/30"
              />
              <span className="text-sm text-zinc-300">
                He leído y acepto el <strong className="text-zinc-100">Aviso de Privacidad</strong>{" "}
                y reconozco el tratamiento de mis datos personales conforme a lo descrito.
              </span>
            </label>

            <Button
              disabled={!accepted || saving}
              className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40"
              onClick={handleAccept}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Aceptar y continuar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
