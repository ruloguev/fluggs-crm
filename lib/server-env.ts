/**
 * Server-only environment variable accessors.
 *
 * Centralising env reads here makes it easy to:
 *  - Validate presence at runtime rather than silently passing `undefined`.
 *  - Add a single import to any API route that needs these values.
 *
 * IMPORTANT: This module must only be imported from server-side code
 * (API routes, Server Components, server actions). Never import it in
 * Client Components — the variables are intentionally not prefixed with
 * NEXT_PUBLIC_ and will be undefined in the browser bundle.
 */

/** Supabase project URL — required by both client and service-role clients. */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined
}

/**
 * Supabase service-role key — grants full DB access, bypasses RLS.
 * Never expose this to the browser.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined
}

/**
 * Anthropic API key used by the AI assistant route.
 * Set as ANTHROPIC_API_KEY in Vercel Environment Variables (Production).
 * Do NOT wrap the value in quotes inside the Vercel dashboard.
 */
export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined
}
