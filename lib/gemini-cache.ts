// Gemini Cached Content Manager
// Stores cache names per company to reuse them across requests
// Cache expires after 1 hour, so we track creation time

type CacheEntry = {
  name: string
  createdAt: number
  ttlMs: number
}

// In-memory cache (works within same server instance)
const cacheStore = new Map<string, CacheEntry>()

const CACHE_TTL = 58 * 60 * 1000 // 58 minutes (Gemini default is 1 hour)

export async function getCachedContent(
  geminiKey: string,
  cacheKey: string,
  systemInstruction: string,
  model: string = "gemini-2.5-flash"
): Promise<string | null> {
  const existing = cacheStore.get(cacheKey)
  if (existing && Date.now() - existing.createdAt < existing.ttlMs) {
    return existing.name
  }

  // Cache expired or doesn't exist, create new one
  try {
    // Delete old cache if exists
    if (existing) {
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${existing.name}?key=${geminiKey}`,
        { method: "DELETE" }
      )
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          ttl: "3600s",
        }),
      }
    )

    if (!res.ok) {
      console.error("[cache] Failed to create cached content:", await res.text())
      return null
    }

    const data = await res.json()
    const entry: CacheEntry = {
      name: data.name,
      createdAt: Date.now(),
      ttlMs: CACHE_TTL,
    }
    cacheStore.set(cacheKey, entry)
    return entry.name
  } catch (err) {
    console.error("[cache] Error creating cached content:", err)
    return null
  }
}

export function clearCache(cacheKey: string, geminiKey: string) {
  const existing = cacheStore.get(cacheKey)
  if (existing) {
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/${existing.name}?key=${geminiKey}`,
      { method: "DELETE" }
    ).catch(() => {})
    cacheStore.delete(cacheKey)
  }
}
