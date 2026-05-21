// Edge Function: send-push
// Triggered when a new notification is created in Supabase
// Sends push notification to all active subscriptions of the user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import webpush from "https://esm.sh/web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@fluggs.com"

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    // Get request body
    const { notification_id, user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get notification details
    let notification = null
    if (notification_id) {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notification_id)
        .single()
      notification = data
    }

    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user_id)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Build push payload
    const payload = JSON.stringify({
      title: notification?.title || "Flugzz CRM",
      body: notification?.body || "Tienes una nueva notificación",
      url: notification?.lead_id ? `/leads/${notification.lead_id}` : "/dashboard",
      notificationId: notification_id,
      tag: notification?.type || "general",
    })

    // Send to all subscriptions
    let sentCount = 0
    const errors: string[] = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
        sentCount++
      } catch (err: any) {
        console.error(`[send-push] Error sending to subscription:`, err.message)
        errors.push(err.message)

        // If subscription is expired/gone, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user_id)
            .eq("endpoint", (sub.subscription as any).endpoint)
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("[send-push] Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
