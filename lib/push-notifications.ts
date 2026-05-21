// Push Notifications utilities
import { createClient } from "@/lib/supabase"
import { createClient as createServerClient } from "@supabase/supabase-js"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Server-side: Send push notification via Edge Function
export async function triggerPushNotification(userId: string, notificationId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Push] Edge function credentials not configured')
    return
  }

  try {
    const supabaseAdmin = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if user has active push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (!subscriptions || subscriptions.length === 0) {
      return // No subscriptions, skip
    }

    // Call Edge Function directly
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        notification_id: notificationId,
        user_id: userId,
      }),
    })

    if (!response.ok) {
      console.error('[Push] Edge function call failed:', response.status)
    }
  } catch (error) {
    console.error('[Push] Failed to trigger push:', error)
  }
}

// Server-side: Create notification and trigger push
export async function createNotificationWithPush({
  company_id,
  user_id,
  lead_id,
  type,
  title,
  body,
}: {
  company_id: string
  user_id: string
  lead_id?: string
  type: string
  title: string
  body: string
}) {
  const supabaseAdmin = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      company_id,
      user_id,
      lead_id,
      type,
      title,
      body,
    })
    .select()
    .single()

  if (error) {
    console.error('[Push] Failed to create notification:', error)
    return null
  }

  // Trigger push notification
  if (data?.id) {
    await triggerPushNotification(user_id, data.id)
  }

  return data
}

export async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Not supported in this browser')
    return false
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')

    // Check current permission
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied')
      return false
    }

    // Get or create subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Convert VAPID key from base64 to Uint8Array
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
    }

    // Save to database
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return false

    const subJson = subscription.toJSON()
    const endpoint = (subJson as any)?.endpoint || ''

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      company_id: profile.company_id,
      endpoint: endpoint,
      subscription: subJson,
    }, { onConflict: 'user_id,endpoint' })

    console.log('[Push] Subscription saved')
    return true
  } catch (error) {
    console.error('[Push] Registration failed:', error)
    return false
  }
}

export async function unregisterPushSubscription() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
      }

      console.log('[Push] Unsubscribed')
    }
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error)
  }
}

export async function getPushSubscriptionStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: 'unsupported', subscribed: false }
  }

  const permission = Notification.permission
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  return {
    supported: true,
    permission,
    subscribed: !!subscription,
  }
}

// Helper: Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
