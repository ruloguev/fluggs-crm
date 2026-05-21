import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
  created_time?: string | number
  field_data?: Array<{ name?: string; values?: string[] }>
  ad_id?: string | number
  campaign_id?: string | number
  adgroup_id?: string | number
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

function getAdminClient(): SupabaseClient {
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

// ── GET: Verificacion del webhook ──
export async function GET(request: NextRequest) {
  const supabase = getAdminClient()
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const { data: integration } = await supabase
    .from('facebook_integrations')
    .select('id')
    .eq('verify_token', token)
    .eq('is_active', true)
    .single()

  if (!integration) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

// ── POST: Recibir eventos de Lead Ads ──
export async function POST(request: NextRequest) {
  const supabase = getAdminClient()
  let body: FacebookWebhookPayload

  try {
    body = await request.json()
  } catch {
    console.error('[facebook-webhook] Invalid JSON received')
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const entries = body?.entry ?? []

  for (const entry of entries) {
    const pageId = entry.id ?? ""
    const changes = entry.changes ?? []

    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id, company_id, form_ids, access_token')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      console.warn(`[facebook-webhook] No integration found for page_id: ${pageId}`)
      continue
    }

    for (const change of changes) {
      if (change.field !== 'leadgen') continue

      const leadgenData = (change.value ?? {}) as FacebookLeadWebhookValue
      const formId      = leadgenData.form_id?.toString() ?? ""

      if (
        integration.form_ids?.length > 0 &&
        !integration.form_ids.includes(formId)
      ) continue

      // Process each lead independently — errors in one don't block others
      try {
        await processLead({
          companyId:      integration.company_id,
          facebookLeadId: leadgenData.leadgen_id?.toString() ?? "",
          pageId,
          formId,
          accessToken:    integration.access_token,
          rawData:        leadgenData,
          supabase,
        })
      } catch (error) {
        console.error('[facebook-webhook] Unexpected error processing lead:', error)
        // Log to failed table even for unexpected errors
        await logFailedLead({
          supabase,
          companyId: integration.company_id,
          facebookLeadId: leadgenData.leadgen_id?.toString() ?? "unknown",
          pageId,
          formId,
          rawData: leadgenData,
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorDetails: error instanceof Error ? { stack: error.stack } : {},
        })
      }
    }
  }

  // Facebook expects a 200 — always respond OK
  return NextResponse.json({ status: 'ok' })
}

// ── Log failed lead to database ──
async function logFailedLead({
  supabase,
  companyId,
  facebookLeadId,
  pageId,
  formId,
  rawData,
  errorMessage,
  errorDetails,
}: {
  supabase: SupabaseClient
  companyId: string
  facebookLeadId: string
  pageId: string
  formId: string
  rawData: FacebookLeadWebhookValue
  errorMessage: string
  errorDetails: Record<string, unknown>
}) {
  try {
    await supabase.from('facebook_leads_failed').insert({
      company_id: companyId,
      facebook_lead_id: facebookLeadId,
      page_id: pageId,
      form_id: formId,
      error_message: errorMessage,
      error_details: errorDetails,
      raw_payload: rawData,
    })

    // Notify admins about the failure
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (admins) {
      for (const admin of admins) {
        try {
          await supabase.from('notifications').insert({
            company_id: companyId,
            user_id: admin.id,
            type: 'system',
            title: '⚠️ Error al procesar lead de Facebook',
            body: `Lead ${facebookLeadId} no se pudo procesar: ${errorMessage}`,
          })
        } catch {}
      }
    }

    console.error(
      `[facebook-webhook] Lead failed: ${facebookLeadId} | ${errorMessage}`
    )
  } catch (logError) {
    console.error('[facebook-webhook] Failed to log error:', logError)
  }
}

// ── Procesar un lead individual ──
async function processLead({
  companyId,
  facebookLeadId,
  pageId,
  formId,
  accessToken,
  rawData,
  supabase,
}: {
  companyId: string
  facebookLeadId: string
  pageId: string
  formId: string
  accessToken: string
  rawData: FacebookLeadWebhookValue
  supabase: SupabaseClient
}) {
  if (!facebookLeadId) return

  // 1. Verificar duplicado
  const { data: existing } = await supabase
    .from('round_robin_log')
    .select('id')
    .eq('facebook_lead_id', facebookLeadId)
    .single()

  if (existing) return

  // 2. Obtener o crear fuente "Facebook Leads"
  let { data: source } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', 'facebook%')
    .single()

  if (!source) {
    const { data: newSource, error: sourceError } = await supabase
      .from('lead_sources')
      .insert({
        company_id: companyId,
        name: 'Facebook Leads',
        icon: 'facebook',
        color: '#1877F2'
      })
      .select('id')
      .single()

    if (sourceError || !newSource) {
      await logFailedLead({
        supabase, companyId, facebookLeadId, pageId, formId, rawData,
        errorMessage: 'No se pudo crear la fuente Facebook Leads',
        errorDetails: { error: sourceError },
      })
      return
    }
    source = newSource
  }

  // 3. Obtener primera etapa del pipeline
  const { data: firstStage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_closed', false)
    .order('position')
    .limit(1)
    .single()

  if (stageError || !firstStage) {
    await logFailedLead({
      supabase, companyId, facebookLeadId, pageId, formId, rawData,
      errorMessage: 'No se encontro etapa inicial del pipeline',
      errorDetails: { error: stageError },
    })
    return
  }

  // 4. Obtener cola Round Robin
  const { data: queue } = await supabase
    .from('round_robin_queues')
    .select('id')
    .eq('company_id', companyId)
    .eq('source', 'facebook')
    .eq('is_active', true)
    .single()

  // 5. Asignar agente
  let assignedUserId: string | null = null

  if (queue) {
    const { data: assignedId, error: assignError } = await supabase
      .rpc('assign_next_agent', { p_queue_id: queue.id })

    if (assignError) {
      console.error('[facebook-webhook] Error assigning agent:', assignError)
    } else {
      assignedUserId = assignedId
    }
  }

  // 6. Obtener detalles del lead si es necesario
  let resolvedLead: FacebookLeadWebhookValue & Partial<FacebookLeadDetails> = rawData
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
      console.error('[facebook-webhook] Error fetching Graph API:', graphError)
      // Continue with webhook data — may still have enough info
    }
  }

  // 7. Extraer campos
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

  // 8. Crear contacto
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
    await logFailedLead({
      supabase, companyId, facebookLeadId, pageId, formId, rawData,
      errorMessage: 'Error creando contacto',
      errorDetails: { error: contactError, fields: { fullName, email, phone } },
    })
    return
  }

  // 9. Crear lead
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
    try { await supabase.from('contacts').delete().eq('id', contact.id).throwOnError() } catch {}

    await logFailedLead({
      supabase, companyId, facebookLeadId, pageId, formId, rawData,
      errorMessage: 'Error creando lead',
      errorDetails: { error: leadError, contact_id: contact.id },
    })
    return
  }

  // 10. Registrar actividad
  await supabase.from('activities').insert({
    company_id: companyId,
    lead_id:    lead.id,
    contact_id: contact.id,
    user_id:    assignedUserId,
    type:       'system',
    title:      'Lead recibido desde Facebook Lead Ads',
    body:       `Formulario: ${formId}. Asignado automaticamente por Round Robin.`,
  })

  // 11. Notificar al agente
  if (assignedUserId) {
    await supabase.from('notifications').insert({
      company_id: companyId,
      user_id:    assignedUserId,
      lead_id:    lead.id,
      type:       'lead_assigned',
      title:      '🎯 Nuevo lead de Facebook',
      body:       `${fullName} esta esperando tu contacto.`,
    })
  }

  // 12. Log de Round Robin
  await supabase.from('round_robin_log').insert({
    queue_id:        queue?.id ?? null,
    company_id:      companyId,
    lead_id:         lead.id,
    assigned_to:     assignedUserId,
    source:          'facebook',
    facebook_lead_id: facebookLeadId,
    raw_data:        resolvedLead,
  })
}
