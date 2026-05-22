import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type FacebookLeadWebhookValue = {
  ad_id?: string | number
  adgroup_id?: string | number
  created_time?: string | number
  form_id?: string | number
  leadgen_id?: string | number
  page_id?: string | number
  field_data?: Array<{ name?: string; values?: string[] }>
}

type FacebookLeadDetails = {
  id: string
  created_time?: string
  field_data?: Array<{ name?: string; values?: string[] }>
  ad_id?: string
  campaign_id?: string
  adgroup_id?: string
  platform?: string
  is_organic?: boolean
}

type FacebookWebhookPayload = {
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: FacebookLeadWebhookValue
    }>
  }>
}

type ResolvedFacebookLead = {
  ad_id?: string | number
  adgroup_id?: string | number
  campaign_id?: string
  platform?: string
  is_organic?: boolean
  field_data?: Array<{ name?: string; values?: string[] }>
  [key: string]: unknown
}

// Service role client — bypass RLS for webhook processing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdminClient(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan variables de entorno de Supabase para procesar Facebook Leads.')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function fetchFacebookLeadDetails(leadId: string, accessToken: string) {
  const version = process.env.META_GRAPH_API_VERSION || 'v23.0'
  const url = new URL(`https://graph.facebook.com/${version}/${leadId}`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,created_time,field_data,ad_id,adgroup_id,campaign_id,is_organic,platform')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(raw || `Meta Graph API respondio ${response.status}`)
  }

  return await response.json() as FacebookLeadDetails
}

// ── GET: Verificación del webhook (Facebook requiere esto primero) ──
export async function GET(request: NextRequest) {
  const supabase = getAdminClient()
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
    .limit(1)
    .maybeSingle()

  if (!integration) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Facebook exige que respondamos con hub.challenge para confirmar
  return new NextResponse(challenge, { status: 200 })
}

// ── POST: Recibir eventos de Lead Ads ────────────────────────
export async function POST(request: NextRequest) {
  const supabase = getAdminClient()
  let body: FacebookWebhookPayload

  try {
    body = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  // Facebook envía un array de entries
  const entries = body?.entry ?? []

  for (const entry of entries) {
    const pageId = entry.id ?? ""
    const changes = entry.changes ?? []

    // Buscar las integraciones activas correspondientes a este Page ID
    const { data: integrations } = await supabase
      .from('facebook_integrations')
      .select('id, company_id, form_ids, access_token')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!integrations?.length) continue

    for (const change of changes) {
      if (change.field !== 'leadgen') continue

      const leadgenData = (change.value ?? {}) as FacebookLeadWebhookValue
      const formId      = leadgenData.form_id?.toString() ?? ""

      for (const integration of integrations) {
        if (
          integration.form_ids?.length > 0 &&
          !integration.form_ids.includes(formId)
        ) continue

        await processLead({
          companyId: integration.company_id,
          integrationId: integration.id,
          facebookLeadId: leadgenData.leadgen_id?.toString() ?? "",
          pageId,
          formId,
          accessToken: integration.access_token,
          rawData: leadgenData,
          supabase,
        })
      }
    }
  }

  // Facebook espera un 200 rápido — siempre respondemos OK
  return NextResponse.json({ status: 'ok' })
}

// ── Procesar un lead individual ───────────────────────────────
async function processLead({
  companyId,
  integrationId,
  facebookLeadId,
  pageId,
  formId,
  accessToken,
  rawData,
  supabase,
}: {
  companyId: string
  integrationId: string
  facebookLeadId: string
  pageId: string
  formId: string
  accessToken: string | null
  rawData: FacebookLeadWebhookValue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}) {
  if (!facebookLeadId) return

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
    .eq('integration_id', integrationId)
    .limit(1)
    .maybeSingle()

  const queueRecord = queue ?? await supabase
    .from('round_robin_queues')
    .select('id')
    .eq('company_id', companyId)
    .eq('source', 'facebook')
    .eq('is_active', true)
    .is('integration_id', null)
    .limit(1)
    .maybeSingle()
    .then((result: { data: { id: string } | null }) => result.data)

  // 5. Asignar el siguiente agente (función atómica en Supabase)
  let assignedUserId: string | null = null

  if (queueRecord) {
    const { data: assignedId } = await supabase
      .rpc('assign_next_agent', { p_queue_id: queueRecord.id })

    assignedUserId = (assignedId as string | null) ?? null
  }

  let resolvedLead: ResolvedFacebookLead = rawData
  let resolvedFieldData = rawData.field_data

  if (!resolvedFieldData?.length && accessToken) {
    try {
      const graphLead = await fetchFacebookLeadDetails(facebookLeadId, accessToken)
      resolvedLead = {
        ...rawData,
        ...graphLead,
        field_data: graphLead.field_data ?? rawData.field_data,
      }
      resolvedFieldData = graphLead.field_data
    } catch (graphError) {
      console.error('Error consultando lead en Meta Graph API:', graphError)
    }
  }

  // 6. Extraer campos del formulario de Facebook
  // Facebook envía los campos como array [{name, values:[...]}]
  const fields: Record<string, string> = {}
  if (Array.isArray(resolvedFieldData)) {
    for (const field of resolvedFieldData) {
      if (field.name) {
        fields[field.name] = field.values?.[0] ?? ''
      }
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
        facebook_ad_id:    resolvedLead.ad_id ?? null,
        facebook_adgroup_id: resolvedLead.adgroup_id ?? null,
        facebook_campaign_id: resolvedLead.campaign_id ?? null,
        facebook_platform: resolvedLead.platform ?? null,
        facebook_is_organic: resolvedLead.is_organic ?? null,
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
    queue_id:        queueRecord?.id ?? null,
    company_id:      companyId,
    lead_id:         lead.id,
    assigned_to:     assignedUserId,
    source:          'facebook',
    facebook_lead_id: facebookLeadId,
    raw_data:        resolvedLead,
  })
}
