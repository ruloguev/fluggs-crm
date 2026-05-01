import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypass RLS for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET: Verificación del webhook (Facebook requiere esto primero) ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Buscamos si el verify_token corresponde a alguna integración activa
  const { data: integration } = await supabase
    .from('facebook_integrations')
    .select('id')
    .eq('verify_token', token)
    .eq('is_active', true)
    .single()

  if (!integration) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Facebook exige que respondamos con hub.challenge para confirmar
  return new NextResponse(challenge, { status: 200 })
}

// ── POST: Recibir eventos de Lead Ads ────────────────────────
export async function POST(request: NextRequest) {
  let body: any

  try {
    body = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  // Facebook envía un array de entries
  const entries: any[] = body?.entry ?? []

  for (const entry of entries) {
    const pageId = entry.id
    const changes: any[] = entry.changes ?? []

    // Buscar la integración correspondiente a este Page ID
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id, company_id, form_ids')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .single()

    if (!integration) continue

    for (const change of changes) {
      if (change.field !== 'leadgen') continue

      const leadgenData = change.value
      const formId      = leadgenData.form_id?.toString()

      // Si tenemos form_ids configurados, filtramos por ellos
      if (
        integration.form_ids?.length > 0 &&
        !integration.form_ids.includes(formId)
      ) continue

      await processLead({
        companyId:      integration.company_id,
        facebookLeadId: leadgenData.leadgen_id?.toString(),
        pageId,
        formId,
        rawData:        leadgenData,
      })
    }
  }

  // Facebook espera un 200 rápido — siempre respondemos OK
  return NextResponse.json({ status: 'ok' })
}

// ── Procesar un lead individual ───────────────────────────────
async function processLead({
  companyId,
  facebookLeadId,
  pageId,
  formId,
  rawData,
}: {
  companyId: string
  facebookLeadId: string
  pageId: string
  formId: string
  rawData: any
}) {
  // 1. Verificar que no sea duplicado
  const { data: existing } = await supabase
    .from('round_robin_log')
    .select('id')
    .eq('facebook_lead_id', facebookLeadId)
    .single()

  if (existing) return // Ya procesado

  // 2. Obtener la fuente "Facebook Leads" de esta company
  const { data: source } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', 'facebook%')
    .single()

  // 3. Obtener la primera etapa del pipeline (etapa inicial)
  const { data: firstStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_closed', false)
    .order('position')
    .limit(1)
    .single()

  // 4. Obtener la cola Round Robin de Facebook
  const { data: queue } = await supabase
    .from('round_robin_queues')
    .select('id')
    .eq('company_id', companyId)
    .eq('source', 'facebook')
    .eq('is_active', true)
    .single()

  // 5. Asignar el siguiente agente (función atómica en Supabase)
  let assignedUserId: string | null = null

  if (queue) {
    const { data: assignedId } = await supabase
      .rpc('assign_next_agent', { p_queue_id: queue.id })

    assignedUserId = assignedId
  }

  // 6. Extraer campos del formulario de Facebook
  // Facebook envía los campos como array [{name, values:[...]}]
  const fields: Record<string, string> = {}
  if (Array.isArray(rawData.field_data)) {
    for (const field of rawData.field_data) {
      fields[field.name] = field.values?.[0] ?? ''
    }
  }

  const fullName = fields['full_name'] || fields['nombre'] || fields['name'] || 'Lead Facebook'
  const email    = fields['email'] || fields['correo'] || null
  const phone    = fields['phone_number'] || fields['telefono'] || fields['phone'] || null

  // 7. Crear el contacto
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      company_id: companyId,
      owner_id:   assignedUserId,
      full_name:  fullName,
      email,
      phone,
      whatsapp:   phone,
      source_id:  source?.id ?? null,
      tags:       ['facebook-lead'],
    })
    .select()
    .single()

  if (contactError || !contact) {
    console.error('Error creando contacto:', contactError)
    return
  }

  // 8. Crear el lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      company_id: companyId,
      contact_id: contact.id,
      owner_id:   assignedUserId,
      stage_id:   firstStage?.id ?? null,
      source_id:  source?.id ?? null,
      title:      `${fullName} — Facebook Lead`,
      priority:   'medium',
      metadata:   {
        facebook_form_id:  formId,
        facebook_page_id:  pageId,
        facebook_lead_id:  facebookLeadId,
        form_fields:       fields,
      },
    })
    .select()
    .single()

  if (leadError || !lead) {
    console.error('Error creando lead:', leadError)
    return
  }

  // 9. Registrar actividad inicial
  await supabase.from('activities').insert({
    company_id: companyId,
    lead_id:    lead.id,
    contact_id: contact.id,
    user_id:    assignedUserId,
    type:       'system',
    title:      'Lead recibido desde Facebook Lead Ads',
    body:       `Formulario: ${formId}. Asignado automáticamente por Round Robin.`,
  })

  // 10. Crear notificación para el agente asignado
  if (assignedUserId) {
    await supabase.from('notifications').insert({
      company_id: companyId,
      user_id:    assignedUserId,
      lead_id:    lead.id,
      type:       'lead_assigned',
      title:      '🎯 Nuevo lead de Facebook',
      body:       `${fullName} está esperando tu contacto.`,
    })
  }

  // 11. Registrar en el log del Round Robin
  await supabase.from('round_robin_log').insert({
    queue_id:        queue?.id ?? null,
    company_id:      companyId,
    lead_id:         lead.id,
    assigned_to:     assignedUserId,
    source:          'facebook',
    facebook_lead_id: facebookLeadId,
    raw_data:        rawData,
  })
}
